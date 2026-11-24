import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Sql } from 'postgres';

export const DATABASE = Symbol('DATABASE');

export const DATABASE_CLIENT = Symbol('DATABASE_CLIENT');

export type Database = PostgresJsDatabase;

/** The database, or a transaction of it: what a write that may join one is given. */
export type DatabaseExecutor = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

export type DatabaseClient = Sql;
