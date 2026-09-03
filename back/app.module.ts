import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { AuthModule } from './domain/auth/module';
import { BugReportModule } from './domain/bugReport/module';
import { CustomFoodModule } from './domain/customFood/module';
import { CustomRecipeModule } from './domain/customRecipe/module';
import { GroceryModule } from './domain/grocery/module';
import { HouseholdModule } from './domain/household/module';
import { ImageLibraryModule } from './domain/imageLibrary/module';
import { ImprovementRequestModule } from './domain/improvementRequest/module';
import { ProfileModule } from './domain/profile/module';
import { UserModule } from './domain/user/module';
import { WeekPlanModule } from './domain/weekPlan/module';
import { WeightModule } from './domain/weight/module';
import { DatabaseInfrastructureModule } from './infrastructure/database/module';
import { GraphqlInfrastructureModule } from './infrastructure/graphql/module';
import { HealthInfrastructureModule } from './infrastructure/http/health.module';
import { MailInfrastructureModule } from './infrastructure/mail/module';
import { PushInfrastructureModule } from './infrastructure/push/module';
import { ThrottlerInfrastructureModule } from './infrastructure/http/throttler.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SentryModule.forRoot(),
    ThrottlerInfrastructureModule,
    HealthInfrastructureModule,
    DatabaseInfrastructureModule,
    MailInfrastructureModule,
    PushInfrastructureModule,
    GraphqlInfrastructureModule,
    UserModule,
    AuthModule,
    ProfileModule,
    HouseholdModule,
    GroceryModule,
    WeekPlanModule,
    CustomFoodModule,
    CustomRecipeModule,
    WeightModule,
    BugReportModule,
    ImprovementRequestModule,
    ImageLibraryModule,
  ],
  // Catches what escapes a controller or a resolver and reports it before Nest
  // turns it into a response. Declared here rather than in main.ts so the e2e
  // harness, which builds the module itself, gets the same server as production.
  providers: [{ provide: APP_FILTER, useClass: SentryGlobalFilter }],
})
export class AppModule {}
