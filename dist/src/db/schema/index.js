"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboard = exports.eventLogs = exports.storeRewards = exports.storeTaskProgress = exports.storeMissionProgress = exports.rewards = exports.rewardTypes = exports.tasks = exports.missions = exports.events = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
// Events table schema
exports.events = (0, sqlite_core_1.sqliteTable)('events', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)('name').notNull().unique(),
    description: (0, sqlite_core_1.text)('description'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Missions table schema
exports.missions = (0, sqlite_core_1.sqliteTable)('missions', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    pointsRequired: (0, sqlite_core_1.integer)('points_required').notNull().default(0),
    isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).notNull().default(true),
    startDate: (0, sqlite_core_1.text)('start_date'),
    endDate: (0, sqlite_core_1.text)('end_date'),
    isRecurring: (0, sqlite_core_1.integer)('is_recurring', { mode: 'boolean' }).notNull().default(false),
    recurrencePattern: (0, sqlite_core_1.text)('recurrence_pattern'),
    prerequisiteMissionId: (0, sqlite_core_1.integer)('prerequisite_mission_id').references(() => exports.missions.id),
    targetType: (0, sqlite_core_1.text)('target_type', { enum: ['all', 'specific', 'filtered'] }).notNull().default('all'),
    targetStores: (0, sqlite_core_1.text)('target_stores'), // JSON string of target store IDs or filter criteria
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Tasks table schema
exports.tasks = (0, sqlite_core_1.sqliteTable)('tasks', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    missionId: (0, sqlite_core_1.integer)('mission_id').notNull().references(() => exports.missions.id),
    eventId: (0, sqlite_core_1.integer)('event_id').notNull().references(() => exports.events.id),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    points: (0, sqlite_core_1.integer)('points').notNull().default(0),
    isOptional: (0, sqlite_core_1.integer)('is_optional', { mode: 'boolean' }).notNull().default(false),
    order: (0, sqlite_core_1.integer)('order').notNull().default(0),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Reward types table schema
exports.rewardTypes = (0, sqlite_core_1.sqliteTable)('reward_types', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)('name').notNull().unique(),
    description: (0, sqlite_core_1.text)('description'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Rewards table schema
exports.rewards = (0, sqlite_core_1.sqliteTable)('rewards', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    missionId: (0, sqlite_core_1.integer)('mission_id').notNull().references(() => exports.missions.id),
    rewardTypeId: (0, sqlite_core_1.integer)('reward_type_id').notNull().references(() => exports.rewardTypes.id),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    value: (0, sqlite_core_1.text)('value').notNull(), // JSON string containing reward details
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Store mission progress table schema
exports.storeMissionProgress = (0, sqlite_core_1.sqliteTable)('store_mission_progress', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    storeId: (0, sqlite_core_1.integer)('store_id').notNull(),
    missionId: (0, sqlite_core_1.integer)('mission_id').notNull().references(() => exports.missions.id),
    status: (0, sqlite_core_1.text)('status', { enum: ['not_started', 'in_progress', 'completed', 'skipped'] }).notNull().default('not_started'),
    pointsEarned: (0, sqlite_core_1.integer)('points_earned').notNull().default(0),
    startedAt: (0, sqlite_core_1.text)('started_at'),
    completedAt: (0, sqlite_core_1.text)('completed_at'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Store task progress table schema
exports.storeTaskProgress = (0, sqlite_core_1.sqliteTable)('store_task_progress', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    storeId: (0, sqlite_core_1.integer)('store_id').notNull(),
    taskId: (0, sqlite_core_1.integer)('task_id').notNull().references(() => exports.tasks.id),
    status: (0, sqlite_core_1.text)('status', { enum: ['not_started', 'completed', 'skipped'] }).notNull().default('not_started'),
    completedAt: (0, sqlite_core_1.text)('completed_at'),
    skippedAt: (0, sqlite_core_1.text)('skipped_at'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Store rewards table schema
exports.storeRewards = (0, sqlite_core_1.sqliteTable)('store_rewards', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    storeId: (0, sqlite_core_1.integer)('store_id').notNull(),
    rewardId: (0, sqlite_core_1.integer)('reward_id').notNull().references(() => exports.rewards.id),
    status: (0, sqlite_core_1.text)('status', { enum: ['earned', 'claimed', 'expired'] }).notNull().default('earned'),
    earnedAt: (0, sqlite_core_1.text)('earned_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    claimedAt: (0, sqlite_core_1.text)('claimed_at'),
    expiresAt: (0, sqlite_core_1.text)('expires_at'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Event logs table schema
exports.eventLogs = (0, sqlite_core_1.sqliteTable)('event_logs', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    storeId: (0, sqlite_core_1.integer)('store_id').notNull(),
    eventId: (0, sqlite_core_1.integer)('event_id').notNull().references(() => exports.events.id),
    payload: (0, sqlite_core_1.text)('payload'), // JSON string of the event payload
    processed: (0, sqlite_core_1.integer)('processed', { mode: 'boolean' }).notNull().default(false),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Leaderboard table schema
exports.leaderboard = (0, sqlite_core_1.sqliteTable)('leaderboard', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    storeId: (0, sqlite_core_1.integer)('store_id').notNull().unique(),
    totalPoints: (0, sqlite_core_1.integer)('total_points').notNull().default(0),
    completedMissions: (0, sqlite_core_1.integer)('completed_missions').notNull().default(0),
    completedTasks: (0, sqlite_core_1.integer)('completed_tasks').notNull().default(0),
    rank: (0, sqlite_core_1.integer)('rank'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
