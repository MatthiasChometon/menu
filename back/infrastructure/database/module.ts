import { Global, Inject, Module, OnModuleDestroy, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE, DATABASE_CLIENT, type Database, type DatabaseClient } from './token';

const clientProvider: Provider = {
  provide: DATABASE_CLIENT,
  useFactory: (config: ConfigService): DatabaseClient =>
    postgres(config.getOrThrow<string>('DATABASE_URL')),
  inject: [ConfigService],
};

// Handed out without a schema: every slice owns its own table and imports it
// directly, which keeps infrastructure unaware of the domain.
const databaseProvider: Provider = {
  provide: DATABASE,
  useFactory: (client: DatabaseClient): Database => drizzle({ client }),
  inject: [DATABASE_CLIENT],
};

@Global()
@Module({
  providers: [clientProvider, databaseProvider],
  exports: [DATABASE],
})
export class DatabaseInfrastructureModule implements OnModuleDestroy {
  constructor(@Inject(DATABASE_CLIENT) private readonly client: DatabaseClient) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.end();
  }
}
