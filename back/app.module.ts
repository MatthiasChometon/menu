import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProfileModule } from './domain/profile/module';
import { DatabaseInfrastructureModule } from './infrastructure/database/module';
import { GraphqlInfrastructureModule } from './infrastructure/graphql/module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseInfrastructureModule,
    GraphqlInfrastructureModule,
    ProfileModule,
  ],
})
export class AppModule {}
