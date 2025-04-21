import { eq, sql, desc, or } from 'drizzle-orm';
import { BaseRepository } from './base-repository';
import { players, playerRewards, rewards } from '../db/schema';
import { Player, PlayerReward, RewardStatus } from '../types';
import { DB } from '../db';

/**
 * Player Repository
 * Handles data access for the Player entity
 */
export class PlayerRepository extends BaseRepository<Player> {
  constructor(db: DB) {
    super(db, 'players');
  }

  /**
   * Find a player by their ID
   * @param id Player ID
   * @returns Player or null if not found
   */
  async findById(id: number): Promise<Player | null> {
    const result = await this.db
      .select()
      .from(players)
      .where(eq(players.id, id))
      .limit(1);

    return result.length ? result[0] as Player : null;
  }

  /**
   * Find a player by their external ID (usually from Salla)
   * @param externalId External player ID
   * @returns Player or null if not found
   */
  async findByExternalId(externalId: string): Promise<Player | null> {
    const result = await this.db
      .select()
      .from(players)
      .where(eq(players.externalId, externalId))
      .limit(1);

    return result.length ? result[0] as Player : null;
  }

  /**
   * Get all players with pagination
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object containing players and total count
   */
  async findAll(
    page: number = 1,
    limit: number = 10
  ): Promise<{ items: Player[]; total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);

    const result = await this.db
      .select()
      .from(players)
      .orderBy(desc(players.createdAt))
      .limit(limitParam)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(players);

    return {
      items: result as Player[],
      total: Number(countResult[0].count)
    };
  }

  /**
   * Create a new player
   * @param data Player data
   * @returns Created player
   */
  async create(data: Partial<Player>): Promise<Player> {
    const result = await this.db
      .insert(players)
      .values({
        ...(data.id ? { id: data.id } : {}),
        externalId: data.externalId || '',
        name: data.name || '',
        email: data.email,
        metadata: data.metadata,
        points: data.points || 0,
        totalPoints: data.totalPoints || 0,
        tasksCompleted: data.tasksCompleted || 0,
        missionsCompleted: data.missionsCompleted || 0
      })
      .returning();

    return result[0] as Player;
  }

  /**
   * Update an existing player
   * @param id Player ID
   * @param data Data to update
   * @returns Updated player
   */
  async update(id: number, data: Partial<Player>): Promise<Player> {
    const result = await this.db
      .update(players)
      .set({
        ...data,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(players.id, id))
      .returning();

    return result[0] as Player;
  }

  /**
   * Delete a player
   * @param id Player ID
   * @returns Boolean indicating success
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(players)
      .where(eq(players.id, id))
      .returning({ id: players.id });

    return result.length > 0;
  }

  /**
   * Get a player by their external ID or create one if not found
   * @param externalId External player ID
   * @param name Player name
   * @param email Optional player email
   * @returns Player (existing or newly created)
   */
  async getOrCreateByExternalId(
    externalId: string,
    name: string,
    email?: string
  ): Promise<Player> {
    // Try to find existing player
    const existingPlayer = await this.findByExternalId(externalId);
    
    if (existingPlayer) {
      return existingPlayer;
    }
    
    // Create new player
    const result = await this.db
      .insert(players)
      .values({
        externalId,
        name,
        email,
      })
      .returning();

    return result[0] as Player;
  }

  /**
   * Search for players by name or email
   * @param searchTerm Search term
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object containing players and total count
   */
  async search(
    searchTerm: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ items: Player[]; total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
    const searchPattern = `%${searchTerm}%`;

    const result = await this.db
      .select()
      .from(players)
      .where(
        or(
          sql`${players.name} LIKE ${searchPattern}`,
          sql`${players.email} LIKE ${searchPattern}`,
          sql`${players.externalId} LIKE ${searchPattern}`
        )
      )
      .orderBy(desc(players.createdAt))
      .limit(limitParam)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(players)
      .where(
        or(
          sql`${players.name} LIKE ${searchPattern}`,
          sql`${players.email} LIKE ${searchPattern}`,
          sql`${players.externalId} LIKE ${searchPattern}`
        )
      );

    return {
      items: result as Player[],
      total: Number(countResult[0].count)
    };
  }

  /**
   * Update player points
   * @param id Player ID
   * @param points Points to add
   * @returns Updated player
   */
  async updatePoints(id: number, points: number): Promise<Player | null> {
    try {
      const result = await this.db
        .update(players)
        .set({
          totalPoints: sql`${players.totalPoints} + ${points}`,
          updatedAt: new Date().toISOString()
        })
        .where(eq(players.id, id))
        .returning();
      
      return result.length > 0 ? result[0] as Player : null;
    } catch (error) {
      console.error('Error updating player points:', error);
      return null;
    }
  }

  /**
   * Add points to a player
   * @param playerId Player ID
   * @param points Points to add
   */
  async addPoints(playerId: number, points: number): Promise<void> {
    await this.db.update(players)
      .set({
        points: sql`${players.points} + ${points}`,
        totalPoints: sql`${players.totalPoints} + ${points}`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(players.id, playerId));
  }

  /**
   * Set points for a player
   * @param playerId Player ID
   * @param points Points to set
   */
  async setPoints(playerId: number, points: number): Promise<void> {
    await this.db.update(players)
      .set({
        points: points,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(players.id, playerId));
  }

  /**
   * Update player progress with their latest achievements
   * @param playerId Player ID
   * @param progress Object containing pointsEarned, tasksCompleted, and missionsCompleted
   */
  async updateProgress(
    playerId: number, 
    { pointsEarned = 0, tasksCompleted = 0, missionsCompleted = 0 }
  ): Promise<void> {
    await this.db.update(players)
      .set({
        points: sql`${players.points} + ${pointsEarned}`,
        totalPoints: sql`${players.totalPoints} + ${pointsEarned}`,
        tasksCompleted: sql`${players.tasksCompleted} + ${tasksCompleted}`,
        missionsCompleted: sql`${players.missionsCompleted} + ${missionsCompleted}`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(players.id, playerId));
  }

  /**
   * Get or create a player by store ID
   * @param storeId Store ID to use as player ID
   * @param externalId Optional external ID
   * @returns Created or found player
   */
  async getOrCreatePlayer(storeId: number, externalId?: string): Promise<Player> {
    // First try to find the player by storeId
    let player = await this.findById(storeId);
    
    // If not found, create a new player
    if (!player) {
      player = await this.create({
        id: storeId,
        externalId: externalId || storeId.toString(),
        name: `Player ${storeId}`,
        points: 0,
        totalPoints: 0,
        tasksCompleted: 0,
        missionsCompleted: 0
      });
    }
    
    return player;
  }
  
  /**
   * Get player rewards
   * @param playerId Player ID
   * @returns Array of player rewards
   */
  async getPlayerRewards(playerId: number): Promise<PlayerReward[]> {
    const result = await this.db
      .select()
      .from(playerRewards)
      .leftJoin(rewards, eq(playerRewards.rewardId, rewards.id))
      .where(eq(playerRewards.playerId, playerId));
      
    return result.map(row => {
      if (!row.rewards) {
        throw new Error(`Reward data is missing for player reward ${row.player_rewards.id}`);
      }
      
      return {
        id: row.rewards.id,
        playerId,
        gameId: row.rewards.gameId,
        missionId: row.rewards.missionId,
        rewardTypeId: row.rewards.rewardTypeId,
        name: row.rewards.name,
        description: row.rewards.description ?? undefined,
        value: row.rewards.value,
        status: row.player_rewards.status,
        earnedAt: row.player_rewards.earnedAt,
        claimedAt: row.player_rewards.claimedAt ?? undefined,
        expiresAt: row.player_rewards.expiresAt ?? undefined,
        createdAt: row.rewards.createdAt,
        updatedAt: row.rewards.updatedAt
      } as PlayerReward;
    });
  }
  
  /**
   * Grant a reward to a player
   * @param playerId Player ID
   * @param rewardId Reward ID
   * @param gameId Game ID
   * @param status Reward status
   */
  async grantRewardToPlayer(
    playerId: number, 
    rewardId: number, 
    gameId: number,
    status: RewardStatus = 'earned'
  ): Promise<void> {
    const now = new Date().toISOString();
    
    await this.db
      .insert(playerRewards)
      .values({
        playerId,
        rewardId,
        gameId,
        status,
        earnedAt: now,
        createdAt: now,
        updatedAt: now
      });
  }
}