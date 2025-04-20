import { DB } from '../db';
import { eq, sql, desc, lt, gt } from 'drizzle-orm';
import { leaderboard } from '../db/schema';
import { LeaderboardContextResult, LeaderboardEntry, LeaderboardRecalculationResult, LeaderboardStats } from '../types';

/**
 * Leaderboard Service
 * Handles business logic for the leaderboard feature
 */
export class LeaderboardService {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Get leaderboard entries with pagination
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object with leaderboard entries and total count
   */
  async getLeaderboard(
    page: number = 1,
    limit: number = 10
  ): Promise<{ entries: LeaderboardEntry[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Get leaderboard entries ordered by rank
    const result = await this.db
      .select()
      .from(leaderboard)
      .orderBy(desc(leaderboard.totalPoints))
      .limit(limit)
      .offset(offset);
    
    // Count total entries
    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(leaderboard);
    
    return {
      entries: result as LeaderboardEntry[],
      total: Number(countResult[0].count)
    };
  }

  /**
   * Get a store's position in the leaderboard with surrounding stores
   * @param storeId Store ID
   * @param context Number of entries to show above and below the store's position
   * @returns Store position with context
   */
  async getLeaderboardPositionWithContext(
    storeId: number,
    context: number = 3
  ): Promise<LeaderboardContextResult> {
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
      .from(leaderboard)
      .where(gt(leaderboard.totalPoints, storeEntry.totalPoints))
      .orderBy(desc(leaderboard.totalPoints))
      .limit(context);
    
    // Get entries below the store's position
    const storesBelow = await this.db
      .select()
      .from(leaderboard)
      .where(lt(leaderboard.totalPoints, storeEntry.totalPoints))
      .orderBy(desc(leaderboard.totalPoints))
      .limit(context);
    
    // Count total stores
    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(leaderboard);
    
    return {
      success: true,
      message: 'Leaderboard position retrieved successfully',
      storePosition: storeEntry,
      storesAbove: storesAbove as LeaderboardEntry[],
      storesBelow: storesBelow as LeaderboardEntry[],
      totalStores: Number(countResult[0].count)
    };
  }

  /**
   * Get leaderboard statistics
   * @returns Leaderboard statistics
   */
  async getLeaderboardStatistics(): Promise<LeaderboardStats> {
    // Count total stores
    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(leaderboard);
    
    // Get top score
    const topScoreResult = await this.db
      .select({ max: sql`MAX(total_points)` })
      .from(leaderboard);
    
    // Get average score
    const avgScoreResult = await this.db
      .select({ avg: sql`AVG(total_points)` })
      .from(leaderboard);
    
    // Get total missions completed
    const missionsResult = await this.db
      .select({ sum: sql`SUM(completed_missions)` })
      .from(leaderboard);
    
    // Get total tasks completed
    const tasksResult = await this.db
      .select({ sum: sql`SUM(completed_tasks)` })
      .from(leaderboard);
    
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
  async recalculateLeaderboard(): Promise<LeaderboardRecalculationResult> {
    try {
      await this.recalculateRankings();
      
      // Count number of stores affected
      const countResult = await this.db
        .select({ count: sql`count(*)` })
        .from(leaderboard);
      
      return {
        success: true,
        message: 'Leaderboard successfully recalculated',
        storesUpdated: Number(countResult[0].count)
      };
    } catch (error: any) {
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
  async getStoreRanking(storeId: number): Promise<LeaderboardEntry | null> {
    const result = await this.db
      .select()
      .from(leaderboard)
      .where(eq(leaderboard.storeId, storeId))
      .limit(1);
    
    return result.length ? result[0] as LeaderboardEntry : null;
  }

  /**
   * Update leaderboard entry for a store
   * @param storeId Store ID
   * @param completedMission Whether a mission was just completed
   * @param completedTasks Number of tasks just completed
   * @param pointsEarned Points earned
   * @returns Updated leaderboard entry
   */
  async updateLeaderboard(
    storeId: number,
    completedMission: boolean = false,
    completedTasks: number = 0,
    pointsEarned: number = 0
  ): Promise<LeaderboardEntry> {
    // Check if entry exists for this store
    const existingEntry = await this.db
      .select()
      .from(leaderboard)
      .where(eq(leaderboard.storeId, storeId))
      .limit(1);
    
    if (existingEntry.length) {
      // Update existing entry
      const entry = existingEntry[0];
      
      const result = await this.db
        .update(leaderboard)
        .set({
          totalPoints: entry.totalPoints + pointsEarned,
          completedMissions: entry.completedMissions + (completedMission ? 1 : 0),
          completedTasks: entry.completedTasks + completedTasks,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(leaderboard.storeId, storeId))
        .returning();
      
      // After updating, recalculate rankings for all stores
      await this.recalculateRankings();
      
      return result[0] as LeaderboardEntry;
    } else {
      // Create new entry
      const result = await this.db
        .insert(leaderboard)
        .values({
          storeId,
          totalPoints: pointsEarned,
          completedMissions: completedMission ? 1 : 0,
          completedTasks: completedTasks,
        })
        .returning();
      
      // After inserting, recalculate rankings for all stores
      await this.recalculateRankings();
      
      return result[0] as LeaderboardEntry;
    }
  }

  /**
   * Recalculate rankings for all stores
   * This updates the 'rank' field for each leaderboard entry
   */
  private async recalculateRankings(): Promise<void> {
    // Get all stores ordered by points
    const orderedStores = await this.db
      .select()
      .from(leaderboard)
      .orderBy(desc(leaderboard.totalPoints));
    
    // Update rank for each store
    for (let i = 0; i < orderedStores.length; i++) {
      await this.db
        .update(leaderboard)
        .set({
          rank: i + 1
        })
        .where(eq(leaderboard.id, orderedStores[i].id));
    }
  }
}