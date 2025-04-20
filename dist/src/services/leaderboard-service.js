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
     * Get a store's position in the leaderboard with surrounding stores
     * @param storeId Store ID
     * @param context Number of entries to show above and below the store's position
     * @returns Store position with context
     */
    async getLeaderboardPositionWithContext(storeId, context = 3) {
        // Get the store's entry
        const storeEntry = await this.getStoreRanking(storeId);
        if (!storeEntry) {
            return {
                success: false,
                message: `Store ${storeId} not found in leaderboard`
            };
        }
        // Get entries above the store's position
        const storesAbove = await this.db
            .select()
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.gt)(schema_1.leaderboard.totalPoints, storeEntry.totalPoints))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.leaderboard.totalPoints))
            .limit(context);
        // Get entries below the store's position
        const storesBelow = await this.db
            .select()
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.lt)(schema_1.leaderboard.totalPoints, storeEntry.totalPoints))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.leaderboard.totalPoints))
            .limit(context);
        // Count total stores
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.leaderboard);
        return {
            success: true,
            message: 'Leaderboard position retrieved successfully',
            storePosition: storeEntry,
            storesAbove: storesAbove,
            storesBelow: storesBelow,
            totalStores: Number(countResult[0].count)
        };
    }
    /**
     * Get leaderboard statistics
     * @returns Leaderboard statistics
     */
    async getLeaderboardStatistics() {
        // Count total stores
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
            totalStores: Number(countResult[0].count),
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
            // Count number of stores affected
            const countResult = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                .from(schema_1.leaderboard);
            return {
                success: true,
                message: 'Leaderboard successfully recalculated',
                storesUpdated: Number(countResult[0].count)
            };
        }
        catch (error) {
            console.error('Error recalculating leaderboard:', error);
            return {
                success: false,
                message: `Error recalculating leaderboard: ${error.message}`,
                storesUpdated: 0
            };
        }
    }
    /**
     * Get a store's rank and position in the leaderboard
     * @param storeId Store ID
     * @returns Store ranking information or null if not found
     */
    async getStoreRanking(storeId) {
        const result = await this.db
            .select()
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.storeId, storeId))
            .limit(1);
        return result.length ? result[0] : null;
    }
    /**
     * Update leaderboard entry for a store
     * @param storeId Store ID
     * @param completedMission Whether a mission was just completed
     * @param completedTasks Number of tasks just completed
     * @param pointsEarned Points earned
     * @returns Updated leaderboard entry
     */
    async updateLeaderboard(storeId, completedMission = false, completedTasks = 0, pointsEarned = 0) {
        // Check if entry exists for this store
        const existingEntry = await this.db
            .select()
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.storeId, storeId))
            .limit(1);
        if (existingEntry.length) {
            // Update existing entry
            const entry = existingEntry[0];
            const result = await this.db
                .update(schema_1.leaderboard)
                .set({
                totalPoints: entry.totalPoints + pointsEarned,
                completedMissions: entry.completedMissions + (completedMission ? 1 : 0),
                completedTasks: entry.completedTasks + completedTasks,
                updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
            })
                .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.storeId, storeId))
                .returning();
            // After updating, recalculate rankings for all stores
            await this.recalculateRankings();
            return result[0];
        }
        else {
            // Create new entry
            const result = await this.db
                .insert(schema_1.leaderboard)
                .values({
                storeId,
                totalPoints: pointsEarned,
                completedMissions: completedMission ? 1 : 0,
                completedTasks: completedTasks,
            })
                .returning();
            // After inserting, recalculate rankings for all stores
            await this.recalculateRankings();
            return result[0];
        }
    }
    /**
     * Recalculate rankings for all stores
     * This updates the 'rank' field for each leaderboard entry
     */
    async recalculateRankings() {
        // Get all stores ordered by points
        const orderedStores = await this.db
            .select()
            .from(schema_1.leaderboard)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.leaderboard.totalPoints));
        // Update rank for each store
        for (let i = 0; i < orderedStores.length; i++) {
            await this.db
                .update(schema_1.leaderboard)
                .set({
                rank: i + 1
            })
                .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.id, orderedStores[i].id));
        }
    }
}
exports.LeaderboardService = LeaderboardService;
