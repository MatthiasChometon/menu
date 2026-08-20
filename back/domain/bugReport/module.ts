import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/module';
import { BugReportRepository } from './repository';
import { BugReportResolver } from './resolver';
import { BugReportService } from './service';

@Module({
  imports: [AuthModule],
  providers: [BugReportResolver, BugReportService, BugReportRepository],
})
export class BugReportModule {}
