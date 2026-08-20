import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { Admins } from './admins.service';
import { AdminGuard } from './guard';
import { BugReportRepository } from './repository';
import { BugReportResolver } from './resolver';
import { BugReportService } from './service';

@Module({
  imports: [AuthModule],
  providers: [BugReportResolver, BugReportService, BugReportRepository, Admins, AdminGuard],
})
export class BugReportModule {}
