import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  // Each slice owns its table, so the schemas are discovered rather than listed.
  schema: './domain/**/schema.ts',
  out: './infrastructure/database/migrations',
  // `generate` never connects, so a checkout without a .env can still write a
  // migration; `migrate` and `studio` fail on the empty address.
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
