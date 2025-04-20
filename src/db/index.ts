import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
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
 */
export async function runMigrations(): Promise<void> {
  // In Cloudflare Workers environment, migrations should be applied using Wrangler CLI
  // This is a placeholder that logs information but doesn't try to run migrations at runtime
  console.log('In production, migrations should be applied using: wrangler d1 migrations apply GAMIFICATION_DB');
  console.log('For development, use: pnpm run setup-db');
  
  // For development environment, you can use the existing script: pnpm run setup-db
  // which runs: wrangler d1 migrations apply GAMIFICATION_DB
}