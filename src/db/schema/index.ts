import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Events table schema
export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Missions table schema
export const missions = sqliteTable('missions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  pointsRequired: integer('points_required').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  startDate: text('start_date'),
  endDate: text('end_date'),
  isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
  recurrencePattern: text('recurrence_pattern'),
  prerequisiteMissionId: integer('prerequisite_mission_id').references((): any => missions.id),
  targetType: text('target_type', { enum: ['all', 'specific', 'filtered'] }).notNull().default('all'),
  targetStores: text('target_stores'), // JSON string of target store IDs or filter criteria
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Tasks table schema
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  missionId: integer('mission_id').notNull().references(() => missions.id),
  eventId: integer('event_id').notNull().references(() => events.id),
  name: text('name').notNull(),
  description: text('description'),
  points: integer('points').notNull().default(0),
  isOptional: integer('is_optional', { mode: 'boolean' }).notNull().default(false),
  order: integer('order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Reward types table schema
export const rewardTypes = sqliteTable('reward_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Rewards table schema
export const rewards = sqliteTable('rewards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  missionId: integer('mission_id').notNull().references(() => missions.id),
  rewardTypeId: integer('reward_type_id').notNull().references(() => rewardTypes.id),
  name: text('name').notNull(),
  description: text('description'),
  value: text('value').notNull(), // JSON string containing reward details
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Store mission progress table schema
export const storeMissionProgress = sqliteTable('store_mission_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storeId: integer('store_id').notNull(),
  missionId: integer('mission_id').notNull().references(() => missions.id),
  status: text('status', { enum: ['not_started', 'in_progress', 'completed', 'skipped'] }).notNull().default('not_started'),
  pointsEarned: integer('points_earned').notNull().default(0),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Store task progress table schema
export const storeTaskProgress = sqliteTable('store_task_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storeId: integer('store_id').notNull(),
  taskId: integer('task_id').notNull().references(() => tasks.id),
  status: text('status', { enum: ['not_started', 'completed', 'skipped'] }).notNull().default('not_started'),
  completedAt: text('completed_at'),
  skippedAt: text('skipped_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Store rewards table schema
export const storeRewards = sqliteTable('store_rewards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storeId: integer('store_id').notNull(),
  rewardId: integer('reward_id').notNull().references(() => rewards.id),
  status: text('status', { enum: ['earned', 'claimed', 'expired'] }).notNull().default('earned'),
  earnedAt: text('earned_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  claimedAt: text('claimed_at'),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Event logs table schema
export const eventLogs = sqliteTable('event_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storeId: integer('store_id').notNull(),
  eventId: integer('event_id').notNull().references(() => events.id),
  payload: text('payload'), // JSON string of the event payload
  processed: integer('processed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Leaderboard table schema
export const leaderboard = sqliteTable('leaderboard', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storeId: integer('store_id').notNull().unique(),
  totalPoints: integer('total_points').notNull().default(0),
  completedMissions: integer('completed_missions').notNull().default(0),
  completedTasks: integer('completed_tasks').notNull().default(0),
  rank: integer('rank'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});