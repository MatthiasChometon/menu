import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// `generate` never connects, so a checkout without a .env can still write a
// migration; every other command needs the address and says so.
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined && !process.argv.includes('generate')) {
  throw new Error('DATABASE_URL is not set: drizzle-kit needs it to reach the database.');
}

export default defineConfig({
  dialect: 'postgresql',
  // Each slice owns its table, so the schemas are discovered rather than listed.
  schema: './domain/**/schema.ts',
  out: './infrastructure/database/migrations',
  dbCredentials: { url: databaseUrl ?? '' },
});
