import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../../infrastructure/mail/service';
import { User } from '../user/model';
import { Admins } from './admins.service';
import { bugReportEmail } from './emails';
import type { ReportBugInput } from './input';
import { BugReportRepository } from './repository';
import type { BugReportRecord } from './type';

@Injectable()
export class BugReportService {
  private readonly logger = new Logger(BugReportService.name);

  constructor(
    private readonly reports: BugReportRepository,
    private readonly admins: Admins,
    private readonly mail: MailService,
  ) {}

  async report(reporter: User, input: ReportBugInput): Promise<BugReportRecord> {
    const record = await this.reports.create(
      reporter.id,
      input.severity,
      input.message,
      input.context,
    );

    // Saved first, announced after — and a failure to announce does not undo
    // the report. Somebody took the trouble to describe a problem; losing it
    // because a mail server was down would be the worse of the two failures.
    await this.announce(record, reporter.email);

    return record;
  }

  private async announce(record: BugReportRecord, reportedBy: string): Promise<void> {
    for (const admin of this.admins.recipients) {
      try {
        await this.mail.send(
          bugReportEmail(admin, record.severity, record.message, record.context, reportedBy),
        );
      } catch (error) {
        // Logged rather than thrown: the reader has done their part, and their
        // report is already safe in the database.
        this.logger.error(`Signalement ${record.id} enregistré mais non annoncé`, error);
      }
    }
  }
}
