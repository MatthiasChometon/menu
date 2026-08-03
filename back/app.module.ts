import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './domain/auth/module';
import { ProfileModule } from './domain/profile/module';
import { UserModule } from './domain/user/module';
import { DatabaseInfrastructureModule } from './infrastructure/database/module';
import { GraphqlInfrastructureModule } from './infrastructure/graphql/module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseInfrastructureModule,
    GraphqlInfrastructureModule,
    UserModule,
    AuthModule,
    ProfileModule,
  ],
})
export class AppModule {}
