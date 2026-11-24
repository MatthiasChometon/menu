import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DatabaseInfrastructureModule } from '../../../infrastructure/database/module';
import { GroceryCatalogRepository } from './repository';
import { GroceryCatalogSeeder } from './seeder';

// Only what the seeding needs. Booting the whole application would drag in
// GraphQL and the HTTP stack for a task that never serves a request.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseInfrastructureModule],
  providers: [GroceryCatalogSeeder, GroceryCatalogRepository],
})
class SeedModule {}

const REFERENCE = resolve(process.cwd(), '..', 'front', 'content', 'carrefour-products.json');

const run = async (): Promise<void> => {
  const context = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['warn', 'error'],
  });

  try {
    const reference: unknown = JSON.parse(await readFile(REFERENCE, 'utf-8'));
    const seeded = await context.get(GroceryCatalogSeeder).seed(reference);
    process.stdout.write(`${seeded.length} products seeded from ${REFERENCE}\n`);
  } finally {
    await context.close();
  }
};

run().catch((error: unknown): void => {
  process.stderr.write(
    `Seeding failed: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
