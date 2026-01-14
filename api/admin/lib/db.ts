import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('DATABASE_URL not configured - database features will not work');
}

export const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

export function getDb() {
  if (!sql) {
    throw new Error('DATABASE_URL not configured');
  }
  return sql;
}
