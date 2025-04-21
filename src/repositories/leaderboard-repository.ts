import { DB } from "../db";
import { BaseRepository } from "./base-repository";
import { eq, and, sql, desc } from "drizzle-orm";
import { LeaderboardEntry } from "../types";
import { players, leaderboard } from "../db/schema";

export class LeaderboardRepository extends BaseRepository<LeaderboardEntry> {
  constructor(db: DB) {
    super(db, "leaderboard");
  }

  /**
   * Find entity by ID
   * @param id Entity ID
   * @returns Entity or null if not found
   */
  async findById(id: number): Promise<LeaderboardEntry | null> {
    const result = await this.db
      .select()
      .from(leaderboard)
      .where(eq(leaderboard.id, id))
      .limit(1);
    
    return result.length > 0 ? result[0] as unknown as LeaderboardEntry : null;
  }

  /**
   * Find all entities with pagination
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object containing items array and total count
   */
  async findAll(page: number = 1, limit: number = 10): Promise<{ items: LeaderboardEntry[], total: number }> {
    const { offset, limit: limitCount } = this.getPaginationParams(page, limit);
    
    const items = await this.db
      .select()
      .from(leaderboard)
      .limit(limitCount)
      .offset(offset);
    
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(leaderboard);
    
    return {
      items: items as unknown as LeaderboardEntry[],
      total: Number(count)
    };
  }

  /**
   * Create new entity
   * @param data Entity data
   * @returns Created entity
   */
  async create(data: Partial<LeaderboardEntry>): Promise<LeaderboardEntry> {
    const now = new Date().toISOString();
    const result = await this.db.insert(leaderboard).values({
      playerId: data.playerId!,
      gameId: data.gameId!,
      totalPoints: data.totalPoints || 0,
      completedMissions: data.completedMissions || 0,
      completedTasks: data.completedTasks || 0,
      rank: data.rank,
      createdAt: now,
      updatedAt: now
    }).returning();
    
    return result[0] as unknown as LeaderboardEntry;
  }

  /**
   * Update existing entity
   * @param id Entity ID
   * @param data Entity data to update
   * @returns Updated entity or null if not found
   */
  async update(id: number, data: Partial<LeaderboardEntry>): Promise<LeaderboardEntry | null> {
    const now = new Date().toISOString();
    const result = await this.db.update(leaderboard)
      .set({
        ...data,
        updatedAt: now
      })
      .where(eq(leaderboard.id, id))
      .returning();
    
    return result.length > 0 ? result[0] as unknown as LeaderboardEntry : null;
  }

  /**
   * Delete entity
   * @param id Entity ID
   * @returns True if deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db.delete(leaderboard)
      .where(eq(leaderboard.id, id))
      .returning({ id: leaderboard.id });
    
    return result.length > 0;
  }

  /**
   * Get the current leaderboard for a game
   * @param gameId The ID of the game
   * @param page Page number for pagination
   * @param limit Number of entries to return
   */
  async getLeaderboard(gameId: number, page: number = 1, limit: number = 10): Promise<{entries: LeaderboardEntry[], total: number}> {
    const offset = (page - 1) * limit;
    
    // Query for leaderboard entries with player information
    const entries = await this.db
      .select({
        id: leaderboard.id,
        playerId: leaderboard.playerId,
        gameId: leaderboard.gameId,
        totalPoints: leaderboard.totalPoints,
        completedMissions: leaderboard.completedMissions,
        completedTasks: leaderboard.completedTasks,
        rank: leaderboard.rank,
        updatedAt: leaderboard.updatedAt,
        playerName: players.name,
        playerExternalId: players.externalId,
        playerEmail: players.email,
      })
      .from(leaderboard)
      .leftJoin(players, eq(leaderboard.playerId, players.id))
      .where(eq(leaderboard.gameId, gameId))
      .orderBy(desc(leaderboard.totalPoints))
      .limit(limit)
      .offset(offset);

    // Get the total count for pagination
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(leaderboard)
      .where(eq(leaderboard.gameId, gameId));

    return {
      entries: entries.map((entry) => ({
        id: entry.id,
        playerId: entry.playerId,
        gameId: entry.gameId,
        totalPoints: entry.totalPoints,
        completedMissions: entry.completedMissions,
        completedTasks: entry.completedTasks,
        rank: entry.rank || 0,
        createdAt: undefined,
        updatedAt: entry.updatedAt,
      })),
      total: Number(count),
    };
  }

  // Alias method for getLeaderboard to fix the method name mismatch
  async getGameLeaderboard(gameId: number, page: number = 1, limit: number = 10): Promise<{entries: LeaderboardEntry[], total: number}> {
    return this.getLeaderboard(gameId, page, limit);
  }

  /**
   * Get the statistics for a leaderboard
   * @param gameId The ID of the game
   */
  async getLeaderboardStats(gameId: number): Promise<any> {
    const [stats] = await this.db
      .select({
        totalPlayers: sql<number>`count(*)`,
        topScore: sql<number>`MAX(${leaderboard.totalPoints})`,
        avgScore: sql<number>`AVG(${leaderboard.totalPoints})`,
        totalMissions: sql<number>`SUM(${leaderboard.completedMissions})`,
        totalTasks: sql<number>`SUM(${leaderboard.completedTasks})`,
      })
      .from(leaderboard)
      .where(eq(leaderboard.gameId, gameId));

    return {
      totalPlayers: Number(stats.totalPlayers),
      topScore: Number(stats.topScore),
      averageScore: Number(stats.avgScore),
      totalMissionsCompleted: Number(stats.totalMissions),
      totalTasksCompleted: Number(stats.totalTasks),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get top players from the leaderboard
   * @param gameId The ID of the game
   * @param count Number of players to retrieve
   */
  async getTopPlayers(gameId: number, count: number = 10): Promise<LeaderboardEntry[]> {
    const entries = await this.db
      .select({
        id: leaderboard.id,
        playerId: leaderboard.playerId,
        gameId: leaderboard.gameId,
        totalPoints: leaderboard.totalPoints,
        completedMissions: leaderboard.completedMissions,
        completedTasks: leaderboard.completedTasks,
        rank: leaderboard.rank,
        updatedAt: leaderboard.updatedAt,
      })
      .from(leaderboard)
      .where(eq(leaderboard.gameId, gameId))
      .orderBy(desc(leaderboard.totalPoints))
      .limit(count);

    return entries as unknown as LeaderboardEntry[];
  }

  /**
   * Update player statistics on the leaderboard
   */
  async updatePlayerStats(playerId: number, gameId: number, stats: { 
    totalPoints?: number, 
    completedMissions?: number, 
    completedTasks?: number 
  }): Promise<void> {
    const existing = await this.db
      .select()
      .from(leaderboard)
      .where(
        and(
          eq(leaderboard.playerId, playerId),
          eq(leaderboard.gameId, gameId)
        )
      )
      .limit(1);

    const now = new Date().toISOString();

    if (existing.length > 0) {
      // Update existing entry
      const updateData: any = { updatedAt: now };
      
      if (stats.totalPoints !== undefined) {
        updateData.totalPoints = stats.totalPoints;
      }
      
      if (stats.completedMissions !== undefined) {
        updateData.completedMissions = stats.completedMissions;
      }
      
      if (stats.completedTasks !== undefined) {
        updateData.completedTasks = stats.completedTasks;
      }
      
      await this.db
        .update(leaderboard)
        .set(updateData)
        .where(
          and(
            eq(leaderboard.playerId, playerId),
            eq(leaderboard.gameId, gameId)
          )
        );
    } else {
      // Create new entry
      await this.db.insert(leaderboard).values({
        playerId,
        gameId,
        totalPoints: stats.totalPoints || 0,
        completedMissions: stats.completedMissions || 0,
        completedTasks: stats.completedTasks || 0,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  /**
   * Recalculate ranks for a game's leaderboard
   * @param gameId The game ID to recalculate ranks for
   */
  async recalculateRanks(gameId: number): Promise<number> {
    // This is a simplified approach. In a production environment with large datasets,
    // you might want to use a more efficient approach or a batch process.
    const entries = await this.db
      .select()
      .from(leaderboard)
      .where(eq(leaderboard.gameId, gameId))
      .orderBy(desc(leaderboard.totalPoints));
    
    let updatedCount = 0;
    
    // Update ranks for all entries
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const newRank = i + 1;
      
      if (entry.rank !== newRank) {
        await this.db
          .update(leaderboard)
          .set({ rank: newRank })
          .where(eq(leaderboard.id, entry.id));
          
        updatedCount++;
      }
    }
    
    return updatedCount;
  }

  /**
   * Get a player's current ranking in a game
   * @param playerId The ID of the player
   * @param gameId The ID of the game
   */
  async getPlayerRanking(playerId: number, gameId: number): Promise<any> {
    const rankData = await this.db
      .select({
        playerId: leaderboard.playerId,
        gameId: leaderboard.gameId,
        totalPoints: leaderboard.totalPoints,
        rank: leaderboard.rank,
        updatedAt: leaderboard.updatedAt
      })
      .from(leaderboard)
      .where(
        and(
          eq(leaderboard.playerId, playerId),
          eq(leaderboard.gameId, gameId)
        )
      )
      .limit(1);

    if (!rankData.length) {
      return null;
    }

    const entry = rankData[0];
    
    // Get player details
    const playerData = await this.db
      .select()
      .from(players)
      .where(eq(players.id, playerId))
      .limit(1);

    const player = playerData.length ? playerData[0] : null;

    return {
      playerId: entry.playerId,
      gameId: entry.gameId,
      points: entry.totalPoints,
      rank: entry.rank || 0,
      player: player ? {
        id: player.id,
        name: player.name,
        externalId: player.externalId,
        email: player.email || null,
      } : null,
      lastUpdated: entry.updatedAt,
    };
  }

  /**
   * Get the players ranked near a specific player
   * @param playerId The ID of the player
   * @param gameId The ID of the game
   * @param range Number of players to include before and after the target player
   */
  async getNearbyPlayers(playerId: number, gameId: number, range: number = 3): Promise<any[]> {
    const playerRank = await this.getPlayerRanking(playerId, gameId);
    
    if (!playerRank) {
      return [];
    }
    
    const minRank = Math.max(1, playerRank.rank - range);
    const maxRank = playerRank.rank + range;

    const rankData = await this.db
      .select({
        playerId: leaderboard.playerId,
        gameId: leaderboard.gameId,
        totalPoints: leaderboard.totalPoints,
        rank: leaderboard.rank,
        updatedAt: leaderboard.updatedAt
      })
      .from(leaderboard)
      .where(
        and(
          eq(leaderboard.gameId, gameId),
          sql`${leaderboard.rank} >= ${minRank}`,
          sql`${leaderboard.rank} <= ${maxRank}`
        )
      )
      .orderBy(leaderboard.rank);

    // Get player details for all nearby players
    const playerIds = rankData.map(entry => entry.playerId);
    
    if (playerIds.length === 0) {
      return [];
    }
    
    const playerData = await this.db
      .select()
      .from(players)
      .where(
        sql`${players.id} IN (${playerIds.join(',')})`
      );

    // Map player data by ID for quick lookup
    const playerMap = new Map();
    playerData.forEach(player => {
      playerMap.set(player.id, player);
    });

    return rankData.map(entry => {
      const player = playerMap.get(entry.playerId);
      return {
        playerId: entry.playerId,
        gameId: entry.gameId,
        points: entry.totalPoints,
        rank: entry.rank || 0,
        player: player ? {
          id: player.id,
          name: player.name,
          externalId: player.externalId,
          email: player.email || null,
        } : null,
        lastUpdated: entry.updatedAt,
      };
    });
  }
}