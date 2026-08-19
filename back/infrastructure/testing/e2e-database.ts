import postgres from 'postgres';

const canConnect = async (url: string): Promise<boolean> => {
  const client = postgres(url, { max: 1, onnotice: (): void => undefined });
  try {
    await client`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await client.end();
  }
};

// e2e tests must never touch the development database: they create and wipe
// rows freely. This provisions the dedicated test database if it is missing.
//
// Creating it needs rights on the server's `postgres` database, which a local
// checkout has and a managed host does not — there the database is handed to
// you already made. So the existing database is what we look for first, and the
// admin connection is only the fallback that builds one when there is none.
const ensureTestDatabase = async (): Promise<void> => {
  const url = process.env.DATABASE_URL;
  if (url === undefined) {
    throw new Error('DATABASE_URL must be set to the test database for e2e tests.');
  }

  if (await canConnect(url)) return;

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
