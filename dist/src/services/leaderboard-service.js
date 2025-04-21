"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
/**
 * Leaderboard Service
 * Handles business logic for the leaderboard feature
 */
class LeaderboardService {
    constructor(db) {
        this.db = db;
    }
    /**
     * Get leaderboard entries with pagination
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object with leaderboard entries and total count
     */
    async getLeaderboard(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        // Get leaderboard entries ordered by rank
        const result = await this.db
            .select()
            .from(schema_1.leaderboard)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.leaderboard.totalPoints))
            .limit(limit)
            .offset(offset);
        // Count total entries
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.leaderboard);
        return {
            entries: result,
            total: Number(countResult[0].count)
        };
    }
    /**
     * Get a player's position in the leaderboard with surrounding players
     * @param playerId Player ID
     * @param context Number of entries to show above and below the player's position
     * @returns Player position with context
     */
    async getLeaderboardPositionWithContext(playerId, context = 3) {
        // Get the player's entry
        const playerEntry = await this.getPlayerRanking(playerId);
        if (!playerEntry) {
            return {
                success: false,
                message: `Player ${playerId} not found in leaderboard`
            };
        }
        // Get entries above the player's position
        const playersAbove = await this.db
            .select()
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.gt)(schema_1.leaderboard.totalPoints, playerEntry.totalPoints))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.leaderboard.totalPoints))
            .limit(context);
        // Get entries below the player's position
        const playersBelow = await this.db
            .select()
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.lt)(schema_1.leaderboard.totalPoints, playerEntry.totalPoints))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.leaderboard.totalPoints))
            .limit(context);
        // Count total players
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.leaderboard);
        return {
            success: true,
            message: 'Leaderboard position retrieved successfully',
            playerPosition: playerEntry,
            playersAbove: playersAbove,
            playersBelow: playersBelow,
            totalPlayers: Number(countResult[0].count)
        };
    }
    /**
     * Get leaderboard statistics
     * @returns Leaderboard statistics
     */
    async getLeaderboardStatistics() {
        // Count total players
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.leaderboard);
        // Get top score
        const topScoreResult = await this.db
            .select({ max: (0, drizzle_orm_1.sql) `MAX(total_points)` })
            .from(schema_1.leaderboard);
        // Get average score
        const avgScoreResult = await this.db
            .select({ avg: (0, drizzle_orm_1.sql) `AVG(total_points)` })
            .from(schema_1.leaderboard);
        // Get total missions completed
        const missionsResult = await this.db
            .select({ sum: (0, drizzle_orm_1.sql) `SUM(completed_missions)` })
            .from(schema_1.leaderboard);
        // Get total tasks completed
        const tasksResult = await this.db
            .select({ sum: (0, drizzle_orm_1.sql) `SUM(completed_tasks)` })
            .from(schema_1.leaderboard);
        return {
            totalPlayers: Number(countResult[0].count),
            topScore: Number(topScoreResult[0].max) || 0,
            averageScore: Math.round(Number(avgScoreResult[0].avg) || 0),
            totalMissionsCompleted: Number(missionsResult[0].sum) || 0,
            totalTasksCompleted: Number(tasksResult[0].sum) || 0,
            lastUpdated: new Date().toISOString()
        };
    }
    /**
     * Recalculate the entire leaderboard
     * This forces a full recalculation of all ranks and positions
     * @returns Result of the recalculation operation
     */
    async recalculateLeaderboard() {
        try {
            await this.recalculateRankings();
            // Count number of players affected
            const countResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.leaderboard);
            return {
                success: true,
                message: 'Leaderboard successfully recalculated',
                entriesUpdated: Number(countResult[0].count),
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('Error recalculating leaderboard:', error);
            return {
                success: false,
                message: `Error recalculating leaderboard: ${error.message}`,
                entriesUpdated: 0,
                timestamp: new Date().toISOString()
            };
        }
    }
    /**
     * Get a player's rank and position in the leaderboard
     * @param playerId Player ID
     * @returns Player ranking information or null if not found
     */
    async getPlayerRanking(playerId) {
        const result = await this.db
            .select()
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.playerId, playerId))
            .limit(1);
        return result.length ? result[0] : null;
    }
    /**
     * Update leaderboard for a player
     * @param playerId Player ID
     * @param missionCompleted Whether a mission was completed
     * @param tasksCompleted Number of tasks completed
     * @param points Points earned
     */
    async updateLeaderboard(playerId, missionCompleted = false, tasksCompleted = 0, points = 0) {
        try {
            // Get player's current game from their most recent activity
            const latestActivity = await this.db.select()
                .from(schema_1.playerMissionProgress)
                .where((0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.playerId, playerId))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.playerMissionProgress.updatedAt))
                .limit(1);
            let gameId = 1; // Default to game ID 1 if no activity found
            if (latestActivity.length > 0) {
                gameId = latestActivity[0].gameId;
            }
            // Get player's current stats
            const playerStats = await this.getPlayerStats(playerId);
            // Update leaderboard entry
            await this.db.insert(schema_1.leaderboard)
                .values({
                gameId,
                playerId,
                totalPoints: playerStats.totalPoints + points,
                completedMissions: playerStats.completedMissions + (missionCompleted ? 1 : 0),
                completedTasks: playerStats.completedTasks + tasksCompleted,
                rank: 0, // Will be updated by scheduled job
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })
                .onConflictDoUpdate({
                target: [schema_1.leaderboard.gameId, schema_1.leaderboard.playerId],
                set: {
                    totalPoints: (0, drizzle_orm_1.sql) `${schema_1.leaderboard.totalPoints} + ${points}`,
                    completedMissions: (0, drizzle_orm_1.sql) `${schema_1.leaderboard.completedMissions} + ${missionCompleted ? 1 : 0}`,
                    completedTasks: (0, drizzle_orm_1.sql) `${schema_1.leaderboard.completedTasks} + ${tasksCompleted}`,
                    updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
                }
            });
            return true;
        }
        catch (error) {
            console.error('Error updating leaderboard:', error);
            return false;
        }
    }
    /**
     * Get a player's stats
     * @param playerId Player ID
     * @returns Player stats
     */
    async getPlayerStats(playerId) {
        const player = await this.db
            .select()
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.playerId, playerId))
            .limit(1);
        if (!player.length) {
            return {
                totalPoints: 0,
                completedMissions: 0,
                completedTasks: 0
            };
        }
        return {
            totalPoints: player[0].totalPoints,
            completedMissions: player[0].completedMissions,
            completedTasks: player[0].completedTasks
        };
    }
    /**
     * Update player's score
     * @param playerId Player ID
     * @param points Points to add
     */
    async updatePlayerScore(playerId, points) {
        await this.updateLeaderboard(playerId, false, 0, points);
    }
    /**
     * Recalculate rankings for all players
     * This updates the 'rank' field for each leaderboard entry
     */
    async recalculateRankings() {
        // Get all players ordered by points
        const orderedPlayers = await this.db
            .select()
            .from(schema_1.leaderboard)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.leaderboard.totalPoints));
        // Update rank for each player
        for (let i = 0; i < orderedPlayers.length; i++) {
            await this.db
                .update(schema_1.leaderboard)
                .set({
                rank: i + 1
            })
                .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.id, orderedPlayers[i].id));
        }
    }
}
exports.LeaderboardService = LeaderboardService;
