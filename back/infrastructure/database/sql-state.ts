import postgres from 'postgres';

export const UNIQUE_VIOLATION = '23505';
const MAX_CAUSE_DEPTH = 5;

// The driver error sits under the ORM's own wrapper, as `cause`.
export const sqlStateOf = (error: unknown): string | undefined => {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth += 1) {
    if (current instanceof postgres.PostgresError) return current.code;
    current = current.cause;
  }
  return undefined;
};
