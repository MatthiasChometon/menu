import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Sql } from 'postgres';

export const DATABASE = Symbol('DATABASE');

export const DATABASE_CLIENT = Symbol('DATABASE_CLIENT');

export type Database = PostgresJsDatabase;

export type DatabaseClient = Sql;
