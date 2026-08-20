import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/currentUser/current-user';
import { AuthGuard } from '../auth/currentUser/guard';
import { User } from '../user/model';
import { BugSeverity, BugStatus } from './enum';
import { Admins } from './admins.service';
import { AdminGuard } from './guard';
import { BugStatusInput, ReportBugInput } from './input';
import { BugReport } from './model';
import { BugReportRepository, type ReportWithReporter } from './repository';
import { BugReportService } from './service';
import type { BugReportRecord } from './type';

const present = (record: BugReportRecord, reporterEmail: string | null): BugReport => ({
  id: record.id,
  severity: record.severity as BugSeverity,
  message: record.message,
  context: record.context,
  status: record.status as BugStatus,
  reportedBy: reporterEmail,
  createdAt: record.createdAt.toISOString(),
});

@Resolver(() => BugReport)
export class BugReportResolver {
  constructor(
    private readonly service: BugReportService,
    private readonly reports: BugReportRepository,
    private readonly admins: Admins,
  ) {}

  // Signed in, but nothing more: anybody using the site may say what is broken,
  // and asking for a right first would silence exactly the reports worth having.
  @Mutation(() => BugReport, { description: 'Reports a problem with the site.' })
  @UseGuards(AuthGuard)
  async reportBug(
    @CurrentUser() user: User,
    @Args('input') input: ReportBugInput,
  ): Promise<BugReport> {
    const record = await this.service.report(user, input);

    return present(record, user.email);
  }

  // Asked by the front so it can hide a menu entry that would only ever fail.
  // Its own question rather than a field on the user: whether somebody may read
  // the reports is this slice's business, and the account model has no reason
  // to learn about it.
  @Query(() => Boolean, { description: 'Whether the signed-in account may read the reports.' })
  @UseGuards(AuthGuard)
  amIAdmin(@CurrentUser() user: User): boolean {
    return this.admins.has(user.email);
  }

  // AuthGuard first: it is what puts the user on the request for AdminGuard to
  // read. Reversed, the second guard would find nobody and refuse everyone.
  @Query(() => [BugReport], { description: 'Every report, newest first. Administrators only.' })
  @UseGuards(AuthGuard, AdminGuard)
  async bugReports(): Promise<BugReport[]> {
    const records = await this.reports.findAll();

    return records.map((record: ReportWithReporter): BugReport =>
      present(record, record.reporterEmail),
    );
  }

  @Mutation(() => BugReport, {
    nullable: true,
    description: 'Marks a report as handled. Null when there is no such report.',
  })
  @UseGuards(AuthGuard, AdminGuard)
  async setBugStatus(@Args('input') input: BugStatusInput): Promise<BugReport | undefined> {
    const record = await this.reports.setStatus(input.id, input.status);

    return record === undefined ? undefined : present(record, null);
  }
}
