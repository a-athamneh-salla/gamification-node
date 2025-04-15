import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import * as schema from './schema';

/**
 * Database type for use throughout the application
 */
export type DB = DrizzleD1Database<typeof schema>;

/**
 * Initialize database connection with Drizzle ORM
 * @param d1Database Cloudflare D1 database binding
 * @returns Drizzle ORM database instance
 */
export function initializeDb(d1Database: D1Database): DB {
  return drizzle(d1Database, { schema });
}

/**
 * Run database migrations
 * @param d1Database Cloudflare D1 database binding
 */
export async function runMigrations(d1Database: D1Database): Promise<void> {
  const db = drizzle(d1Database);
  console.log('Running database migrations...');
  await migrate(db, { migrationsFolder: 'migrations' });
  console.log('Migrations completed successfully.');
}