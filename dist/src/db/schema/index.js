"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboard = exports.eventLogs = exports.playerRewards = exports.playerTaskProgress = exports.playerMissionProgress = exports.rewards = exports.rewardTypes = exports.tasks = exports.missions = exports.events = exports.players = exports.games = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
// Games table schema
exports.games = (0, sqlite_core_1.sqliteTable)('games', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).notNull().default(true),
    startDate: (0, sqlite_core_1.text)('start_date'),
    endDate: (0, sqlite_core_1.text)('end_date'),
    targetType: (0, sqlite_core_1.text)('target_type', { enum: ['all', 'specific', 'filtered'] }).notNull().default('all'),
    targetPlayers: (0, sqlite_core_1.text)('target_players'), // JSON string of target player IDs or filter criteria
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Players table schema
exports.players = (0, sqlite_core_1.sqliteTable)('players', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    externalId: (0, sqlite_core_1.text)('external_id').notNull().unique(), // External ID from Salla
    name: (0, sqlite_core_1.text)('name').notNull(),
    email: (0, sqlite_core_1.text)('email'),
    metadata: (0, sqlite_core_1.text)('metadata'), // JSON string with additional player data
    points: (0, sqlite_core_1.integer)('points').notNull().default(0),
    totalPoints: (0, sqlite_core_1.integer)('total_points').notNull().default(0),
    tasksCompleted: (0, sqlite_core_1.integer)('tasks_completed').notNull().default(0),
    missionsCompleted: (0, sqlite_core_1.integer)('missions_completed').notNull().default(0),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Events table schema
exports.events = (0, sqlite_core_1.sqliteTable)('events', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)('name').notNull().unique(),
    description: (0, sqlite_core_1.text)('description'),
    type: (0, sqlite_core_1.text)('type'),
    playerId: (0, sqlite_core_1.integer)('player_id'),
    data: (0, sqlite_core_1.text)('data'),
    timestamp: (0, sqlite_core_1.text)('timestamp'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Missions table schema
exports.missions = (0, sqlite_core_1.sqliteTable)('missions', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    gameId: (0, sqlite_core_1.integer)('game_id').notNull().references(() => exports.games.id),
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
    targetPlayers: (0, sqlite_core_1.text)('target_players'), // JSON string of target player IDs or filter criteria
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Tasks table schema
exports.tasks = (0, sqlite_core_1.sqliteTable)('tasks', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    missionId: (0, sqlite_core_1.integer)('mission_id').notNull().references(() => exports.missions.id),
    eventId: (0, sqlite_core_1.text)('event_id').notNull(),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    points: (0, sqlite_core_1.integer)('points').notNull().default(0),
    isOptional: (0, sqlite_core_1.integer)('is_optional', { mode: 'boolean' }).notNull().default(false),
    isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).notNull().default(true),
    requiredProgress: (0, sqlite_core_1.integer)('required_progress').notNull().default(1),
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
    gameId: (0, sqlite_core_1.integer)('game_id').notNull().references(() => exports.games.id),
    rewardTypeId: (0, sqlite_core_1.integer)('reward_type_id').notNull().references(() => exports.rewardTypes.id),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    value: (0, sqlite_core_1.text)('value').notNull(), // JSON string containing reward details
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Player mission progress table schema (replacing store_mission_progress)
exports.playerMissionProgress = (0, sqlite_core_1.sqliteTable)('player_mission_progress', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    gameId: (0, sqlite_core_1.integer)('game_id').notNull(),
    missionId: (0, sqlite_core_1.integer)('mission_id').notNull(),
    playerId: (0, sqlite_core_1.integer)('player_id').notNull(),
    status: (0, sqlite_core_1.text)('status', { enum: ['not_started', 'in_progress', 'completed', 'skipped'] }).notNull().default('not_started'),
    pointsEarned: (0, sqlite_core_1.integer)('points_earned').notNull().default(0),
    progress: (0, sqlite_core_1.integer)('progress').notNull().default(0),
    startedAt: (0, sqlite_core_1.text)('started_at'),
    completedAt: (0, sqlite_core_1.text)('completed_at'),
    skippedAt: (0, sqlite_core_1.text)('skipped_at'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Player task progress table schema (replacing store_task_progress)
exports.playerTaskProgress = (0, sqlite_core_1.sqliteTable)('player_task_progress', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    playerId: (0, sqlite_core_1.integer)('player_id').notNull(),
    taskId: (0, sqlite_core_1.integer)('task_id').notNull(),
    gameId: (0, sqlite_core_1.integer)('game_id').notNull(),
    status: (0, sqlite_core_1.text)('status', { enum: ['not_started', 'in_progress', 'completed', 'skipped'] }).notNull().default('not_started'),
    progress: (0, sqlite_core_1.integer)('progress').notNull().default(0),
    completedAt: (0, sqlite_core_1.text)('completed_at'),
    skippedAt: (0, sqlite_core_1.text)('skipped_at'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
}, (table) => ({
    playerTaskIndex: (0, sqlite_core_1.uniqueIndex)('player_task_idx').on(table.playerId, table.taskId)
}));
// Player rewards table schema (replacing store_rewards)
exports.playerRewards = (0, sqlite_core_1.sqliteTable)('player_rewards', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    playerId: (0, sqlite_core_1.integer)('player_id').notNull(),
    gameId: (0, sqlite_core_1.integer)('game_id').notNull().references(() => exports.games.id),
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
    playerId: (0, sqlite_core_1.integer)('player_id').notNull(),
    gameId: (0, sqlite_core_1.integer)('game_id').notNull(),
    eventId: (0, sqlite_core_1.integer)('event_id').notNull().references(() => exports.events.id),
    payload: (0, sqlite_core_1.text)('payload'), // JSON string of the event payload
    processed: (0, sqlite_core_1.integer)('processed', { mode: 'boolean' }).notNull().default(false),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
// Leaderboard table schema
exports.leaderboard = (0, sqlite_core_1.sqliteTable)('leaderboard', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    playerId: (0, sqlite_core_1.integer)('player_id').notNull(),
    gameId: (0, sqlite_core_1.integer)('game_id').notNull().references(() => exports.games.id),
    totalPoints: (0, sqlite_core_1.integer)('total_points').notNull().default(0),
    completedMissions: (0, sqlite_core_1.integer)('completed_missions').notNull().default(0),
    completedTasks: (0, sqlite_core_1.integer)('completed_tasks').notNull().default(0),
    rank: (0, sqlite_core_1.integer)('rank'),
    createdAt: (0, sqlite_core_1.text)('created_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, sqlite_core_1.text)('updated_at').notNull().default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`)
});
