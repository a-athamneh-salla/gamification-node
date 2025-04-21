import { DB } from '../db';
import { PlayerRepository } from '../repositories/player-repository';
import { rewards, playerRewards } from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { Reward, RewardStatus, PlayerReward, IRewardService } from '../types';

/**
 * Reward Service
 * Handles business logic for rewards
 */
export class RewardService implements IRewardService {
  private db: DB;
  private playerRepository: PlayerRepository;

  constructor(db: DB) {
    this.db = db;
    this.playerRepository = new PlayerRepository(db);
  }

  /**
   * Grant a reward to a player
   * @param playerId Player ID
   * @param reward Reward object
   * @returns Granted reward
   */
  async grantReward(playerId: number, reward: any): Promise<any> {
    try {
      // Check if player already has this reward
      const playerRewards = await this.playerRepository.getPlayerRewards(playerId);
      const alreadyHasReward = playerRewards.some(r => r.id === reward.id);
      
      if (alreadyHasReward) {
        console.log(`Player ${playerId} already has reward ${reward.id}`);
        return null;
      }
      
      // Grant reward
      const now = new Date().toISOString();
      let expiresAt = undefined;
      
      // Set expiration if applicable
      if (reward.expirationDays) {
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + reward.expirationDays);
        expiresAt = expireDate.toISOString();
      }
      
      // Create player reward
      await this.playerRepository.grantRewardToPlayer(
        playerId,
        reward.id,
        reward.gameId,
        'earned'
      );
      
      return {
        ...reward,
        playerId,
        status: 'earned',
        earnedAt: now,
        expiresAt
      };
    } catch (error) {
      console.error(`Error granting reward ${reward.id} to player ${playerId}:`, error);
      return null;
    }
  }

  /**
   * Grant multiple rewards to a player
   * @param playerId Player ID 
   * @param rewardsList Array of rewards to grant
   * @param context Additional context (e.g. mission ID)
   * @returns Array of granted rewards
   */
  async grantRewards(
    playerId: number,
    rewardsList: Reward[],
    _context?: { missionId?: number; gameId?: number }
  ): Promise<PlayerReward[]> {
    const grantedRewards: PlayerReward[] = [];

    for (const reward of rewardsList) {
      try {
        const playerReward = await this.grantReward(playerId, reward);
        if (playerReward) {
          grantedRewards.push(playerReward);
        }
      } catch (error) {
        console.error(`Failed to grant reward ${reward.id} to player ${playerId}:`, error);
      }
    }

    return grantedRewards;
  }

  /**
   * Get rewards for a player with optional status filtering and pagination
   * @param playerId Player ID
   * @param status Filter by reward status
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object with rewards array and total count
   */
  async getRewardsByPlayer(
    playerId: number,
    status: RewardStatus | 'all' = 'all',
    page: number = 1,
    limit: number = 10
  ): Promise<{ rewards: any[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const conditions = eq(playerRewards.playerId, playerId);
    
    // Add status filter if provided
    const statusCondition = status !== 'all' 
      ? and(conditions, eq(playerRewards.status, status as RewardStatus)) 
      : conditions;
    
    // Get rewards with their details
    const result = await this.db
      .select({
        playerReward: playerRewards,
        reward: rewards
      })
      .from(playerRewards)
      .leftJoin(rewards, eq(playerRewards.rewardId, rewards.id))
      .where(statusCondition)
      .limit(limit)
      .offset(offset);
    
    // Count total rewards matching the criteria
    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(playerRewards)
      .where(statusCondition);

    // Format the rewards for response
    const formattedRewards = result.map(({ playerReward, reward }) => {
      if (!reward) return null;
      return {
        id: reward.id,
        name: reward.name,
        description: reward.description,
        type: reward.rewardTypeId,
        value: JSON.parse(reward.value || '{}'),
        status: playerReward.status,
        earned_at: playerReward.earnedAt,
        claimed_at: playerReward.claimedAt,
        expires_at: playerReward.expiresAt
      };
    }).filter(item => item !== null);

    return {
      rewards: formattedRewards,
      total: Number(countResult[0].count)
    };
  }

  /**
   * Get a specific reward for a player
   * @param playerId Player ID
   * @param rewardId Reward ID
   * @returns Reward information or null if not found
   */
  async getRewardById(playerId: number, rewardId: number): Promise<Reward | null> {
    const result = await this.db
      .select({
        playerReward: playerRewards,
        reward: rewards
      })
      .from(playerRewards)
      .leftJoin(rewards, eq(playerRewards.rewardId, rewards.id))
      .where(
        and(
          eq(playerRewards.playerId, playerId),
          eq(playerRewards.rewardId, rewardId)
        )
      )
      .limit(1);
    
    if (!result.length || !result[0].reward) {
      return null;
    }
    
    const { reward, playerReward } = result[0];
    
    return {
      id: reward.id,
      gameId: reward.gameId,
      missionId: reward.missionId,
      rewardTypeId: reward.rewardTypeId,
      name: reward.name,
      description: reward.description || undefined,
      value: reward.value,
      status: playerReward.status as RewardStatus,
      earnedAt: playerReward.earnedAt || undefined,
      claimedAt: playerReward.claimedAt || undefined,
      expiresAt: playerReward.expiresAt || undefined,
      createdAt: reward.createdAt,
      updatedAt: reward.updatedAt
    };
  }

  /**
   * Claim a reward for a player
   * @param playerId Player ID
   * @param rewardId Reward ID
   * @returns Object indicating success or failure
   */
  async claimReward(playerId: number, rewardId: number): Promise<{
    success: boolean;
    message: string;
    reward?: Reward;
  }> {
    try {
      // Check if the player has earned this reward
      const playerRewardResult = await this.db
        .select()
        .from(playerRewards)
        .where(
          and(
            eq(playerRewards.playerId, playerId),
            eq(playerRewards.rewardId, rewardId)
          )
        )
        .limit(1);
      
      if (!playerRewardResult.length) {
        return {
          success: false,
          message: `Reward with ID ${rewardId} not found for player ${playerId}`
        };
      }
      
      const playerReward = playerRewardResult[0];
      
      // Check if reward is already claimed
      if (playerReward.status === 'claimed') {
        return {
          success: false,
          message: 'Reward has already been claimed'
        };
      }
      
      // Check if reward is expired
      if (playerReward.status === 'expired' || 
          (playerReward.expiresAt && new Date(playerReward.expiresAt) < new Date())) {
        return {
          success: false,
          message: 'Reward has expired and cannot be claimed'
        };
      }
      
      // Update reward status to claimed
      const now = new Date().toISOString();
      await this.db
        .update(playerRewards)
        .set({
          status: 'claimed',
          claimedAt: now,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(
          and(
            eq(playerRewards.playerId, playerId),
            eq(playerRewards.rewardId, rewardId)
          )
        );
      
      // Get the updated reward
      const reward = await this.getRewardById(playerId, rewardId);
      
      return {
        success: true,
        message: 'Reward claimed successfully',
        reward: reward || undefined
      };
    } catch (error: any) {
      console.error('Error claiming reward:', error);
      return {
        success: false,
        message: `Error claiming reward: ${error.message}`
      };
    }
  }

  /**
   * Grant a reward to a player when a mission is completed
   * @param playerId Player ID
   * @param missionId Mission ID
   * @returns Object indicating success or failure
   */
  async grantRewardForMission(playerId: number, missionId: number): Promise<{
    success: boolean;
    rewardId?: number;
    message: string;
  }> {
    try {
      // Find the reward for this mission
      const rewardResult = await this.db
        .select()
        .from(rewards)
        .where(eq(rewards.missionId, missionId))
        .limit(1);
      
      if (!rewardResult.length) {
        return {
          success: false,
          message: `No reward found for mission ${missionId}`
        };
      }
      
      const reward = rewardResult[0];
      
      // Check if the player already has this reward
      const existingReward = await this.db
        .select()
        .from(playerRewards)
        .where(
          and(
            eq(playerRewards.playerId, playerId),
            eq(playerRewards.rewardId, reward.id)
          )
        )
        .limit(1);
      
      if (existingReward.length) {
        return {
          success: false,
          rewardId: reward.id,
          message: 'Player already has this reward'
        };
      }
      
      // Determine expiration date if applicable
      let expiresAt: string | undefined;
      const rewardValue = JSON.parse(reward.value || '{}');
      if (rewardValue.expirationDays) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + rewardValue.expirationDays);
        expiresAt = expirationDate.toISOString();
      }
      
      // Grant the reward to the player
      const now = new Date().toISOString();
      await this.db
        .insert(playerRewards)
        .values({
          playerId,
          rewardId: reward.id,
          gameId: reward.gameId, // Add the gameId from the reward
          status: 'earned',
          earnedAt: now,
          expiresAt
        });
      
      return {
        success: true,
        rewardId: reward.id,
        message: 'Reward granted successfully'
      };
    } catch (error: any) {
      console.error('Error granting reward:', error);
      return {
        success: false,
        message: `Error granting reward: ${error.message}`
      };
    }
  }

  /**
   * Get player rewards by status 
   * @param playerId Player ID
   * @param status Optional status filter
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object with rewards array and total count
   */
  async getPlayerRewards(
    playerId: number,
    status?: RewardStatus,
    page: number = 1,
    limit: number = 10
  ): Promise<{ rewards: PlayerReward[]; total: number }> {
    const result = await this.db
      .select()
      .from(playerRewards)
      .leftJoin(rewards, eq(playerRewards.rewardId, rewards.id))
      .where(and(
        eq(playerRewards.playerId, playerId),
        status ? eq(playerRewards.status, status) : undefined
      ))
      .limit(limit)
      .offset((page - 1) * limit);

    const total = await this.db
      .select({ count: sql`count(*)` })
      .from(playerRewards)
      .where(and(
        eq(playerRewards.playerId, playerId),
        status ? eq(playerRewards.status, status) : undefined
      ));

    const mappedRewards = result.map(row => {
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

    return {
      rewards: mappedRewards,
      total: Number(total[0].count)
    };
  }

  /**
   * Get rewards for a player (renamed from getRewardsByStore to be consistent with player focus)
   * @param playerId Player ID
   * @param status Filter by status
   * @param page Page number
   * @param limit Items per page
   * @returns Player rewards with pagination
   */
  async getRewardsByStore(playerId: number, status?: string, page: number = 1, limit: number = 10): Promise<{ rewards: any[], total: number }> {
    return await this.getPlayerRewards(playerId, status as RewardStatus, page, limit);
  }

  async findById(id: number): Promise<Reward | null> {
    const result = await this.db
      .select()
      .from(rewards)
      .where(eq(rewards.id, id))
      .limit(1);

    if (!result.length) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      gameId: row.gameId,
      missionId: row.missionId,
      rewardTypeId: row.rewardTypeId,
      name: row.name,
      description: row.description ?? undefined,
      value: row.value,
      status: undefined,
      earnedAt: undefined,
      claimedAt: undefined,
      expiresAt: undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Grant rewards for a completed mission
   * @param missionId Mission ID
   * @param playerId Player ID
   * @param gameId Optional game ID
   * @returns Array of granted rewards
   */
  async grantRewardsForMission(missionId: number, playerId: number, gameId?: number): Promise<Reward[]> {
    try {
      // Find all rewards for this mission
      const missionRewards = await this.db
        .select()
        .from(rewards)
        .where(eq(rewards.missionId, missionId));
      
      if (!missionRewards.length) {
        console.log(`No rewards found for mission ${missionId}`);
        return [];
      }
      
      const grantedRewards: Reward[] = [];
      
      // Grant each reward to the player
      for (const reward of missionRewards) {
        try {
          const result = await this.grantReward(playerId, {
            ...reward,
            gameId: gameId || reward.gameId
          });
          
          if (result) {
            grantedRewards.push(result);
          }
        } catch (error) {
          console.error(`Error granting reward ${reward.id} for mission ${missionId} to player ${playerId}:`, error);
        }
      }
      
      return grantedRewards;
    } catch (error) {
      console.error(`Error granting rewards for mission ${missionId} to player ${playerId}:`, error);
      return [];
    }
  }

  /**
   * Get unclaimed rewards for a player with pagination
   * @param playerId Player ID
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object with rewards array and total count
   */
  async getUnclaimedRewards(
    playerId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ rewards: PlayerReward[]; total: number }> {
    return this.getPlayerRewards(playerId, 'earned', page, limit);
  }
}