import { DB } from "../db";
import { BaseRepository } from "./base-repository";
import { eq, and, sql } from "drizzle-orm";
import { Reward, RewardStatus, PlayerReward } from "../types";
import { rewards, playerRewards, missions } from "../db/schema";

/**
 * Reward Repository
 * Handles data access for the Reward entity
 */
export class RewardRepository extends BaseRepository<Reward> {
  constructor(db: DB) {
    super(db, "rewards");
  }

  /**
   * Find entity by ID
   * @param id Entity ID
   * @returns Entity or null if not found
   */
  async findById(id: number): Promise<Reward | null> {
    const result = await this.db
      .select()
      .from(rewards)
      .where(eq(rewards.id, id))
      .limit(1);
    
    return result.length > 0 ? result[0] as unknown as Reward : null;
  }

  /**
   * Find all entities with pagination
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object containing items array and total count
   */
  async findAll(page: number = 1, limit: number = 10): Promise<{ items: Reward[], total: number }> {
    const { offset, limit: limitCount } = this.getPaginationParams(page, limit);
    
    const items = await this.db
      .select()
      .from(rewards)
      .limit(limitCount)
      .offset(offset);
    
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(rewards);
    
    return {
      items: items as unknown as Reward[],
      total: Number(count)
    };
  }

  /**
   * Create new entity
   * @param data Entity data
   * @returns Created entity
   */
  async create(data: Partial<Reward>): Promise<Reward> {
    if (!data.missionId || !data.gameId || !data.rewardTypeId || !data.name || !data.value) {
      throw new Error('Missing required fields for reward creation');
    }

    const result = await this.db.insert(rewards).values({
      missionId: data.missionId,
      gameId: data.gameId,
      rewardTypeId: data.rewardTypeId,
      name: data.name,
      description: data.description,
      value: data.value
    }).returning();
    
    return result[0] as unknown as Reward;
  }

  /**
   * Update existing entity
   * @param id Entity ID
   * @param data Entity data to update
   * @returns Updated entity or null if not found
   */
  async update(id: number, data: Partial<Reward>): Promise<Reward | null> {
    const result = await this.db.update(rewards)
      .set({
        ...data,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(rewards.id, id))
      .returning();
    
    return result.length > 0 ? result[0] as unknown as Reward : null;
  }

  /**
   * Delete entity
   * @param id Entity ID
   * @returns True if deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db.delete(rewards)
      .where(eq(rewards.id, id))
      .returning({ id: rewards.id });
    
    return result.length > 0;
  }

  /**
   * Find rewards by mission ID
   * @param missionId Mission ID
   * @returns Array of rewards
   */
  async findByMissionId(missionId: number): Promise<Reward[]> {
    const result = await this.db
      .select()
      .from(rewards)
      .where(eq(rewards.missionId, missionId));
    
    return result as unknown as Reward[];
  }

  /**
   * Find rewards by mission ID (alias for findByMissionId)
   * @param missionId Mission ID
   * @returns Rewards array
   */
  async findByMission(missionId: number): Promise<any[]> {
    try {
      const result = await this.db.select()
        .from(rewards)
        .where(eq(rewards.missionId, missionId));
      
      return result;
    } catch (error) {
      console.error('Error finding rewards by mission ID:', error);
      throw error;
    }
  }

  /**
   * Get player rewards by player ID with optional status filter
   * @param playerId Player ID
   * @param status Optional status filter
   * @returns Array of rewards with player status
   */
  async getPlayerRewards(playerId: number, status?: RewardStatus): Promise<Reward[]> {
    const query = this.db
      .select({
        reward: rewards,
        status: playerRewards.status,
        earnedAt: playerRewards.earnedAt,
        claimedAt: playerRewards.claimedAt,
        expiresAt: playerRewards.expiresAt
      })
      .from(rewards)
      .innerJoin(playerRewards, and(
        eq(rewards.id, playerRewards.rewardId),
        eq(playerRewards.playerId, playerId)
      ));
    
    if (status) {
      query.where(eq(playerRewards.status, status));
    }
    
    const result = await query;
    
    return result.map(item => ({
      ...item.reward,
      status: item.status,
      earnedAt: item.earnedAt,
      claimedAt: item.claimedAt,
      expiresAt: item.expiresAt
    })) as unknown as Reward[];
  }

  /**
   * Award a reward to a player
   * @param rewardId Reward ID
   * @param playerId Player ID
   * @param expiresAt Optional expiration date
   * @returns Boolean indicating success
   */
  async awardToPlayer(rewardId: number, playerId: number, expiresAt?: string): Promise<boolean> {
    try {
      // Get reward to get the game ID
      const reward = await this.findById(rewardId);
      if (!reward) {
        throw new Error(`Reward with ID ${rewardId} not found`);
      }

      // Insert player reward record
      await this.db.insert(playerRewards).values({
        rewardId,
        playerId,
        gameId: reward.gameId,
        status: 'earned',
        earnedAt: new Date().toISOString(),
        expiresAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      return true;
    } catch (error) {
      console.error('Error awarding reward to player:', error);
      return false;
    }
  }

  /**
   * Mark a player's reward as claimed
   * @param rewardId Reward ID
   * @param playerId Player ID
   * @returns Boolean indicating success
   */
  async markAsClaimed(rewardId: number, playerId: number): Promise<boolean> {
    try {
      const result = await this.db.update(playerRewards)
        .set({
          status: 'claimed',
          claimedAt: new Date().toISOString(),
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(and(
          eq(playerRewards.rewardId, rewardId),
          eq(playerRewards.playerId, playerId),
          eq(playerRewards.status, 'earned')
        ))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error('Error marking reward as claimed:', error);
      return false;
    }
  }

  /**
   * Mark expired rewards
   * @returns Number of rewards marked as expired
   */
  async markExpiredRewards(): Promise<number> {
    try {
      const now = new Date().toISOString();
      const result = await this.db.update(playerRewards)
        .set({
          status: 'expired',
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(and(
          sql`${playerRewards.expiresAt} IS NOT NULL`,
          sql`${playerRewards.expiresAt} < ${now}`,
          eq(playerRewards.status, 'earned')
        ))
        .returning();
      
      return result.length;
    } catch (error) {
      console.error('Error marking expired rewards:', error);
      return 0;
    }
  }

  /**
   * Store a reward for a player
   * @param gameId Game ID
   * @param playerId Player ID
   * @param rewardId Reward ID
   * @param status Status of the reward
   * @param earnedAt Date when the reward was earned
   * @param expiresAt Expiration date of the reward (if applicable)
   * @returns ID of the inserted reward
   */
  async storeRewards(
    gameId: number,
    playerId: number,
    rewardId: number,
    status: RewardStatus = "earned",
    earnedAt: string = new Date().toISOString(),
    expiresAt?: string
  ): Promise<number> {
    try {
      const result = await this.db.insert(playerRewards)
        .values({
          gameId,
          playerId,
          rewardId,
          status: status as 'earned' | 'claimed' | 'expired', // Cast to literal type
          earnedAt,
          expiresAt
        })
        .returning({ id: playerRewards.id });
        
      return result[0].id;
    } catch (error) {
      console.error("Error storing player reward:", error);
      throw error;
    }
  }

  /**
   * Grant a reward to a player
   * @param playerId Player ID
   * @param reward Reward object
   */
  async grantReward(playerId: number, reward: Reward): Promise<void> {
    const mission = await this.db
      .select()
      .from(missions)
      .where(eq(missions.id, reward.missionId))
      .limit(1);

    if (!mission.length) {
      throw new Error(`Mission ${reward.missionId} not found`);
    }

    const now = new Date().toISOString();
    const gameId = mission[0].gameId;

    await this.db
      .insert(playerRewards)
      .values({
        playerId,
        rewardId: reward.id,
        gameId,
        status: 'earned',
        earnedAt: now,
        createdAt: now,
        updatedAt: now
      });
  }

  /**
   * Grant a reward to a player with gameId
   * @param rewardId Reward ID
   * @param playerId Player ID
   * @param gameId Game ID
   * @param expiresAt Optional expiration date
   * @returns Boolean indicating success
   */
  async grantToPlayer(rewardId: number, playerId: number, gameId: number, expiresAt?: string): Promise<boolean> {
    try {
      // Insert player reward record
      await this.db.insert(playerRewards).values({
        rewardId,
        playerId,
        gameId,
        status: 'earned',
        earnedAt: new Date().toISOString(),
        expiresAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      return true;
    } catch (error) {
      console.error('Error granting reward to player:', error);
      return false;
    }
  }

  /**
   * Create a player reward
   * @param playerId Player ID
   * @param reward Reward object
   * @returns PlayerReward object
   */
  async createPlayerReward(playerId: number, reward: Reward): Promise<PlayerReward> {
    const result = await this.db
      .insert(playerRewards)
      .values({
        gameId: reward.gameId,
        playerId,
        rewardId: reward.id,
        status: 'earned' as const,
        earnedAt: new Date().toISOString()
      })
      .returning();

    return {
      id: result[0].id,
      playerId,
      gameId: reward.gameId,
      missionId: reward.missionId,
      rewardTypeId: reward.rewardTypeId,
      name: reward.name,
      description: reward.description,
      value: reward.value,
      status: 'earned',
      earnedAt: result[0].earnedAt,
      claimedAt: undefined,
      expiresAt: undefined,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt
    };
  }

  /**
   * Grant a reward to a player with status
   * @param playerId Player ID
   * @param rewardId Reward ID
   * @param gameId Game ID
   * @param status Status of the reward
   * @returns Object indicating success and details
   */
  async grantRewardToPlayer(
    playerId: number,
    rewardId: number,
    gameId: number,
    status: RewardStatus = 'earned'
  ): Promise<any> {
    try {
      const now = new Date().toISOString();
      
      // Check if the player already has this reward
      const existingReward = await this.db
        .select()
        .from(playerRewards)
        .where(
          and(
            eq(playerRewards.playerId, playerId),
            eq(playerRewards.rewardId, rewardId)
          )
        )
        .limit(1);
      
      if (existingReward.length > 0) {
        return {
          success: false,
          message: 'Player already has this reward'
        };
      }
      
      // Grant the reward
      const result = await this.db
        .insert(playerRewards)
        .values({
          playerId,
          rewardId,
          gameId,
          status: status as 'earned' | 'claimed' | 'expired', // Cast to literal type
          earnedAt: now,
          createdAt: now,
          updatedAt: now
        })
        .returning();
      
      if (!result.length) {
        throw new Error('Failed to grant reward');
      }
      
      return {
        success: true,
        message: 'Reward granted successfully',
        reward: result[0]
      };
    } catch (error) {
      console.error('Error granting reward:', error);
      throw error;
    }
  }
}