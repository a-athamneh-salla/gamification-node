import { DB } from '../db';
import { eq, sql, desc, lt, gt } from 'drizzle-orm';
import { leaderboard, playerMissionProgress } from '../db/schema';
import { 
  LeaderboardContextResult, 
  LeaderboardEntry, 
  LeaderboardRecalculationResult, 
  LeaderboardStats,
  ILeaderboardService 
} from '../types';

/**
 * Leaderboard Service
 * Handles business logic for the leaderboard feature
 */
export class LeaderboardService implements ILeaderboardService {
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
   * Get a player's position in the leaderboard with surrounding players
   * @param playerId Player ID
   * @param context Number of entries to show above and below the player's position
   * @returns Player position with context
   */
  async getLeaderboardPositionWithContext(
    playerId: number,
    context: number = 3
  ): Promise<LeaderboardContextResult> {
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
      .from(leaderboard)
      .where(gt(leaderboard.totalPoints, playerEntry.totalPoints))
      .orderBy(desc(leaderboard.totalPoints))
      .limit(context);
    
    // Get entries below the player's position
    const playersBelow = await this.db
      .select()
      .from(leaderboard)
      .where(lt(leaderboard.totalPoints, playerEntry.totalPoints))
      .orderBy(desc(leaderboard.totalPoints))
      .limit(context);
    
    // Count total players
    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(leaderboard);
    
    return {
      success: true,
      message: 'Leaderboard position retrieved successfully',
      playerPosition: playerEntry,
      playersAbove: playersAbove as LeaderboardEntry[],
      playersBelow: playersBelow as LeaderboardEntry[],
      totalPlayers: Number(countResult[0].count)
    };
  }

  /**
   * Get leaderboard statistics
   * @returns Leaderboard statistics
   */
  async getLeaderboardStatistics(): Promise<LeaderboardStats> {
    // Count total players
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
  async recalculateLeaderboard(): Promise<LeaderboardRecalculationResult> {
    try {
      await this.recalculateRankings();
      
      // Count number of players affected
      const countResult = await this.db
        .select({ count: sql`count(*)` })
        .from(leaderboard);
      
      return {
        success: true,
        message: 'Leaderboard successfully recalculated',
        entriesUpdated: Number(countResult[0].count),
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
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
  async getPlayerRanking(playerId: number): Promise<LeaderboardEntry | null> {
    const result = await this.db
      .select()
      .from(leaderboard)
      .where(eq(leaderboard.playerId, playerId))
      .limit(1);
    
    return result.length ? result[0] as LeaderboardEntry : null;
  }

  /**
   * Update leaderboard for a player
   * @param playerId Player ID
   * @param missionCompleted Whether a mission was completed
   * @param tasksCompleted Number of tasks completed
   * @param points Points earned
   */
  async updateLeaderboard(
    playerId: number,
    missionCompleted: boolean = false,
    tasksCompleted: number = 0,
    points: number = 0
  ) {
    try {
      // Get player's current game from their most recent activity
      const latestActivity = await this.db.select()
        .from(playerMissionProgress)
        .where(eq(playerMissionProgress.playerId, playerId))
        .orderBy(desc(playerMissionProgress.updatedAt))
        .limit(1);
      
      let gameId = 1; // Default to game ID 1 if no activity found
      if (latestActivity.length > 0) {
        gameId = latestActivity[0].gameId;
      }
      
      // Get player's current stats
      const playerStats = await this.getPlayerStats(playerId);
      
      // Update leaderboard entry
      await this.db.insert(leaderboard)
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
          target: [leaderboard.gameId, leaderboard.playerId],
          set: {
            totalPoints: sql`${leaderboard.totalPoints} + ${points}`,
            completedMissions: sql`${leaderboard.completedMissions} + ${missionCompleted ? 1 : 0}`,
            completedTasks: sql`${leaderboard.completedTasks} + ${tasksCompleted}`,
            updatedAt: sql`CURRENT_TIMESTAMP`
          }
        });
      
      return true;
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      return false;
    }
  }

  /**
   * Get a player's stats
   * @param playerId Player ID
   * @returns Player stats
   */
  async getPlayerStats(playerId: number): Promise<{ totalPoints: number; completedMissions: number; completedTasks: number }> {
    const player = await this.db
      .select()
      .from(leaderboard)
      .where(eq(leaderboard.playerId, playerId))
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
  async updatePlayerScore(playerId: number, points: number): Promise<void> {
    await this.updateLeaderboard(playerId, false, 0, points);
  }

  /**
   * Recalculate rankings for all players
   * This updates the 'rank' field for each leaderboard entry
   */
  private async recalculateRankings(): Promise<void> {
    // Get all players ordered by points
    const orderedPlayers = await this.db
      .select()
      .from(leaderboard)
      .orderBy(desc(leaderboard.totalPoints));
    
    // Update rank for each player
    for (let i = 0; i < orderedPlayers.length; i++) {
      await this.db
        .update(leaderboard)
        .set({
          rank: i + 1
        })
        .where(eq(leaderboard.id, orderedPlayers[i].id));
    }
  }
}