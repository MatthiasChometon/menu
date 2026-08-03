import postgres from 'postgres';

// e2e tests must never touch the development database: they create and wipe
// rows freely. This provisions the dedicated test database if it is missing.
const ensureTestDatabase = async (): Promise<void> => {
  const url = process.env.DATABASE_URL;
  if (url === undefined) {
    throw new Error('DATABASE_URL must be set to the test database for e2e tests.');
  }

  const separatorIndex = url.lastIndexOf('/');
  const databaseName = url.slice(separatorIndex + 1);
  const adminUrl = `${url.slice(0, separatorIndex)}/postgres`;

  const admin = postgres(adminUrl);
  try {
    const existing = await admin`SELECT 1 FROM pg_database WHERE datname = ${databaseName}`;
    if (existing.length === 0) {
      await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await admin.end();
  }
};

export const setup = async (): Promise<void> => {
  await ensureTestDatabase();
};
