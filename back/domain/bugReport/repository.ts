import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infrastructure/database/token';
import { user } from '../user/schema';
import { bugReport, reportBlock } from './schema';
import type { BugReportRecord, ReportContext } from './type';

/** A report plus the address to answer it at. Null once that account is gone. */
export type ReportWithReporter = BugReportRecord & {
  reporterEmail: string | null;
  reporterBlocked: boolean;
};

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
      .select({ report: bugReport, reporterEmail: user.email, blockedAt: reportBlock.blockedAt })
      .from(bugReport)
      .leftJoin(user, eq(user.id, bugReport.userId))
      .leftJoin(reportBlock, eq(reportBlock.userId, bugReport.userId))
      .orderBy(desc(bugReport.createdAt));

    return rows.map(({ report, reporterEmail, blockedAt }): ReportWithReporter => ({
      ...report,
      reporterEmail,
      reporterBlocked: blockedAt !== null,
    }));
  }

  /** How many this account has filed since a moment. Counted from the reports
   *  themselves rather than kept in a tally: a tally drifts, and there is
   *  nothing here a count cannot answer. */
  async countSince(userId: string, since: Date): Promise<number> {
    const [row] = await this.database
      .select({ total: count() })
      .from(bugReport)
      .where(and(eq(bugReport.userId, userId), gte(bugReport.createdAt, since)));

    return row?.total ?? 0;
  }

  /** Whose report this is, so the screen can act on the account behind it.
   *  Null when the account has since been closed. */
  async reporterOf(reportId: string): Promise<string | null | undefined> {
    const [row] = await this.database
      .select({ userId: bugReport.userId })
      .from(bugReport)
      .where(eq(bugReport.id, reportId));

    return row === undefined ? undefined : row.userId;
  }

  async isBlocked(userId: string): Promise<boolean> {
    const [row] = await this.database
      .select()
      .from(reportBlock)
      .where(eq(reportBlock.userId, userId));

    return row !== undefined;
  }

  async setBlocked(userId: string, blocked: boolean): Promise<void> {
    if (!blocked) {
      await this.database.delete(reportBlock).where(eq(reportBlock.userId, userId));
      return;
    }

    // Blocking twice is not an error, it is the same answer said again.
    await this.database.insert(reportBlock).values({ userId }).onConflictDoNothing();
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
