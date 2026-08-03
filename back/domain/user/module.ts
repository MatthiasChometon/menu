import { Module } from '@nestjs/common';
import { UserMapper } from './mapper';
import { UserRepository } from './repository';

@Module({
  providers: [UserRepository, UserMapper],
  exports: [UserRepository, UserMapper],
})
export class UserModule {}
