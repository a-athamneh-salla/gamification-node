import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Games table schema
export const games = sqliteTable('games', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  startDate: text('start_date'),
  endDate: text('end_date'),
  targetType: text('target_type', { enum: ['all', 'specific', 'filtered'] }).notNull().default('all'),
  targetPlayers: text('target_players'), // JSON string of target player IDs or filter criteria
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Players table schema
export const players = sqliteTable('players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  externalId: text('external_id').notNull().unique(), // External ID from Salla
  name: text('name').notNull(),
  email: text('email'),
  metadata: text('metadata'), // JSON string with additional player data
  points: integer('points').notNull().default(0),
  totalPoints: integer('total_points').notNull().default(0),
  tasksCompleted: integer('tasks_completed').notNull().default(0),
  missionsCompleted: integer('missions_completed').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Events table schema
export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  type: text('type'),
  playerId: integer('player_id'),
  data: text('data'),
  timestamp: text('timestamp'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Missions table schema
export const missions = sqliteTable('missions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameId: integer('game_id').notNull().references(() => games.id),
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
  targetPlayers: text('target_players'), // JSON string of target player IDs or filter criteria
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Tasks table schema
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  missionId: integer('mission_id').notNull().references(() => missions.id),
  eventId: text('event_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  points: integer('points').notNull().default(0),
  isOptional: integer('is_optional', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  requiredProgress: integer('required_progress').notNull().default(1),
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
  gameId: integer('game_id').notNull().references(() => games.id),
  rewardTypeId: integer('reward_type_id').notNull().references(() => rewardTypes.id),
  name: text('name').notNull(),
  description: text('description'),
  value: text('value').notNull(), // JSON string containing reward details
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Player mission progress table schema (replacing store_mission_progress)
export const playerMissionProgress = sqliteTable('player_mission_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameId: integer('game_id').notNull(),
  missionId: integer('mission_id').notNull(),
  playerId: integer('player_id').notNull(),
  status: text('status', { enum: ['not_started', 'in_progress', 'completed', 'skipped'] }).notNull().default('not_started'),
  pointsEarned: integer('points_earned').notNull().default(0),
  progress: integer('progress').notNull().default(0),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  skippedAt: text('skipped_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Player task progress table schema (replacing store_task_progress)
export const playerTaskProgress = sqliteTable('player_task_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerId: integer('player_id').notNull(),
  taskId: integer('task_id').notNull(),
  gameId: integer('game_id').notNull(),
  status: text('status', { enum: ['not_started', 'in_progress', 'completed', 'skipped'] }).notNull().default('not_started'),
  progress: integer('progress').notNull().default(0),
  completedAt: text('completed_at'),
  skippedAt: text('skipped_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  playerTaskIndex: uniqueIndex('player_task_idx').on(table.playerId, table.taskId)
}));

// Player rewards table schema (replacing store_rewards)
export const playerRewards = sqliteTable('player_rewards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerId: integer('player_id').notNull(),
  gameId: integer('game_id').notNull().references(() => games.id),
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
  playerId: integer('player_id').notNull(),
  gameId: integer('game_id').notNull(),
  eventId: integer('event_id').notNull().references(() => events.id),
  payload: text('payload'), // JSON string of the event payload
  processed: integer('processed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

// Leaderboard table schema
export const leaderboard = sqliteTable('leaderboard', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerId: integer('player_id').notNull(),
  gameId: integer('game_id').notNull().references(() => games.id),
  totalPoints: integer('total_points').notNull().default(0),
  completedMissions: integer('completed_missions').notNull().default(0),
  completedTasks: integer('completed_tasks').notNull().default(0),
  rank: integer('rank'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});