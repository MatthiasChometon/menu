import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../../infrastructure/mail/service';
import { Admins } from '../auth/admin/admins.service';
import { User } from '../user/model';
import { improvementRequestEmail } from './emails';
import type { RequestImprovementInput } from './input';
import { ImprovementRequestRepository } from './repository';
import type { ImprovementRequestRecord } from './type';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// The cap is on the announcements, never on the ideas: a row costs nothing, an
// email that pulls someone out of what they were doing costs a great deal.
// Somebody bursting with suggestions still gets every one saved and every one
// on the screen; only the notices past the fourth of an hour go quiet.
const NOTICES_PER_HOUR = 3;
const NOTICES_PER_DAY = 10;

@Injectable()
export class ImprovementRequestService {
  private readonly logger = new Logger(ImprovementRequestService.name);

  constructor(
    private readonly requests: ImprovementRequestRepository,
    private readonly admins: Admins,
    private readonly mail: MailService,
  ) {}

  async request(
    requester: User,
    input: RequestImprovementInput,
  ): Promise<ImprovementRequestRecord> {
    const record = await this.requests.create(
      requester.id,
      input.importance,
      input.message,
      input.context,
    );

    // Saved first, announced after — a failure to announce never loses the idea.
    await this.announce(record, requester);

    return record;
  }

  private async announce(record: ImprovementRequestRecord, requester: User): Promise<void> {
    const now = Date.now();
    const filedToday = await this.requests.countSince(requester.id, new Date(now - DAY_MS));
    const filedThisHour = await this.requests.countSince(requester.id, new Date(now - HOUR_MS));

    // Counted including the one just filed, so the fourth of an hour is the
    // first to go unannounced. The idea itself is already safe.
    if (filedThisHour > NOTICES_PER_HOUR || filedToday > NOTICES_PER_DAY) {
      this.logger.warn(
        `Proposition ${record.id} enregistrée sans notification : ${filedToday} en 24 h pour ${requester.email}`,
      );
      return;
    }

    for (const admin of this.admins.recipients) {
      try {
        await this.mail.send(
          improvementRequestEmail(
            admin,
            record.importance,
            record.message,
            record.context,
            requester.email,
            filedToday,
          ),
        );
      } catch (error) {
        this.logger.error(`Proposition ${record.id} enregistrée mais non annoncée`, error);
      }
    }
  }
}
