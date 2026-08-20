import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { MailService } from '../../infrastructure/mail/service';
import { User } from '../user/model';
import { Admins } from './admins.service';
import { bugReportEmail } from './emails';
import type { ReportBugInput } from './input';
import { BugReportRepository } from './repository';
import type { BugReportRecord } from './type';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// What is spammable here is attention, not storage: a row costs nothing, an
// email that pulls somebody out of what they were doing costs a great deal. So
// the cap is on the announcements and never on the reports — somebody who has
// just hit their fourth bug of the evening still gets to describe it, and it
// still reaches the screen.
//
// Three an hour is more than a real reader ever files in one sitting, and ten a
// day bounds a bad night without ever refusing a word.
const NOTICES_PER_HOUR = 3;
const NOTICES_PER_DAY = 10;

@Injectable()
export class BugReportService {
  private readonly logger = new Logger(BugReportService.name);

  constructor(
    private readonly reports: BugReportRepository,
    private readonly admins: Admins,
    private readonly mail: MailService,
  ) {}

  async report(reporter: User, input: ReportBugInput): Promise<BugReportRecord> {
    // Checked before anything is written: a blocked account should not be able
    // to fill the table either, and the refusal costs one lookup.
    if (await this.reports.isBlocked(reporter.id)) {
      throw new ForbiddenException('This account can no longer send reports.');
    }

    const record = await this.reports.create(
      reporter.id,
      input.severity,
      input.message,
      input.context,
    );

    // Saved first, announced after — and a failure to announce does not undo
    // the report. Somebody took the trouble to describe a problem; losing it
    // because a mail server was down would be the worse of the two failures.
    await this.announce(record, reporter);

    return record;
  }

  private async announce(record: BugReportRecord, reporter: User): Promise<void> {
    const now = Date.now();
    const filedToday = await this.reports.countSince(reporter.id, new Date(now - DAY_MS));
    const filedThisHour = await this.reports.countSince(reporter.id, new Date(now - HOUR_MS));

    // Counted including the one just filed, so the fourth of an hour is the
    // first to go unannounced. The report itself is already safe.
    if (filedThisHour > NOTICES_PER_HOUR || filedToday > NOTICES_PER_DAY) {
      this.logger.warn(
        `Signalement ${record.id} enregistré sans notification : ${filedToday} en 24 h pour ${reporter.email}`,
      );
      return;
    }

    for (const admin of this.admins.recipients) {
      try {
        await this.mail.send(
          bugReportEmail(
            admin,
            record.severity,
            record.message,
            record.context,
            reporter.email,
            filedToday,
          ),
        );
      } catch (error) {
        // Logged rather than thrown: the reader has done their part, and their
        // report is already safe in the database.
        this.logger.error(`Signalement ${record.id} enregistré mais non annoncé`, error);
      }
    }
  }
}
