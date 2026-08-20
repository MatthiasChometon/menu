import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DatabaseInfrastructureModule } from '../../../infrastructure/database/module';
import { GroceryCatalogRepository } from './repository';
import { GroceryCatalogSeeder } from './seeder';
import { ReferenceEntry } from './type';

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
    // JSON.parse hands back any, and this is the one edge where the shape is
    // asserted rather than inferred: the file is data on disk, not code.
    const reference = JSON.parse(await readFile(REFERENCE, 'utf-8')) as Record<
      string,
      ReferenceEntry | string
    >;
    const seeded = await context.get(GroceryCatalogSeeder).seed(reference);
    process.stdout.write(`${seeded.length} products seeded from ${REFERENCE}\n`);
  } finally {
    await context.close();
  }
};

void run();
