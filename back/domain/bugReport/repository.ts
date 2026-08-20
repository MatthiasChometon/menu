import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { user } from '../user/schema';
import { bugReport } from './schema';
import type { BugReportRecord, ReportContext } from './type';

/** A report plus the address to answer it at. Null once that account is gone. */
export type ReportWithReporter = BugReportRecord & { reporterEmail: string | null };

@Injectable()
export class BugReportRepository {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async create(
    userId: string,
    severity: string,
    message: string,
    context: ReportContext,
  ): Promise<BugReportRecord> {
    const [record] = await this.database
      .insert(bugReport)
      .values({ userId, severity, message, context })
      .returning();

    return record;
  }

  // Newest first: a list of problems is read from the top, and the one that
  // just came in is the one somebody is waiting on.
  async findAll(): Promise<ReportWithReporter[]> {
    const rows = await this.database
      .select({ report: bugReport, reporterEmail: user.email })
      .from(bugReport)
      .leftJoin(user, eq(user.id, bugReport.userId))
      .orderBy(desc(bugReport.createdAt));

    return rows.map(({ report, reporterEmail }): ReportWithReporter => ({
      ...report,
      reporterEmail,
    }));
  }

  async setStatus(id: string, status: string): Promise<BugReportRecord | undefined> {
    const [record] = await this.database
      .update(bugReport)
      .set({ status })
      .where(eq(bugReport.id, id))
      .returning();

    return record;
  }
}
