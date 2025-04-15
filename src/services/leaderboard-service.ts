import { DB } from '../db';
import { eq, sql, desc } from 'drizzle-orm';
import { leaderboard } from '../db/schema';
import { LeaderboardEntry } from '../types';

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