import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './domain/auth/module';
import { BugReportModule } from './domain/bugReport/module';
import { ImageLibraryModule } from './domain/imageLibrary/module';
import { ProfileModule } from './domain/profile/module';
import { UserModule } from './domain/user/module';
import { WeekPlanModule } from './domain/weekPlan/module';
import { DatabaseInfrastructureModule } from './infrastructure/database/module';
import { GraphqlInfrastructureModule } from './infrastructure/graphql/module';
import { HealthInfrastructureModule } from './infrastructure/http/health.module';
import { MailInfrastructureModule } from './infrastructure/mail/module';
import { ThrottlerInfrastructureModule } from './infrastructure/http/throttler.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerInfrastructureModule,
    HealthInfrastructureModule,
    DatabaseInfrastructureModule,
    MailInfrastructureModule,
    GraphqlInfrastructureModule,
    UserModule,
    AuthModule,
    ProfileModule,
    WeekPlanModule,
    BugReportModule,
    ImageLibraryModule,
  ],
})
export class AppModule {}
