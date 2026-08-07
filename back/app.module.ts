import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './domain/auth/module';
import { ProfileModule } from './domain/profile/module';
import { UserModule } from './domain/user/module';
import { WeekPlanModule } from './domain/weekPlan/module';
import { DatabaseInfrastructureModule } from './infrastructure/database/module';
import { GraphqlInfrastructureModule } from './infrastructure/graphql/module';
import { ThrottlerInfrastructureModule } from './infrastructure/http/throttler.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerInfrastructureModule,
    DatabaseInfrastructureModule,
    GraphqlInfrastructureModule,
    UserModule,
    AuthModule,
    ProfileModule,
    WeekPlanModule,
  ],
})
export class AppModule {}
