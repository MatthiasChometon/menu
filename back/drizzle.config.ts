import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  // Each slice owns its table, so the schemas are discovered rather than listed.
  schema: './domain/**/schema.ts',
  out: './infrastructure/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
