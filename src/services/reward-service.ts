import { DB } from '../db';
import { and, eq, sql } from 'drizzle-orm';
import { rewards, storeRewards } from '../db/schema';
import { RewardStatus } from '../types';

/**
 * Reward Service
 * Handles business logic for rewards
 */
export class RewardService {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  /**
   * Get rewards for a store with optional status filtering and pagination
   * @param storeId Store ID
   * @param status Filter by reward status
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object with rewards array and total count
   */
  async getRewardsByStore(
    storeId: number,
    status: RewardStatus | 'all' = 'all',
    page: number = 1,
    limit: number = 10
  ): Promise<{ rewards: any[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const conditions = eq(storeRewards.storeId, storeId);
    
    // Add status filter if provided
    const statusCondition = status !== 'all' 
      ? and(conditions, eq(storeRewards.status, status)) 
      : conditions;
    
    // Get rewards with their details
    const result = await this.db
      .select({
        storeReward: storeRewards,
        reward: rewards
      })
      .from(storeRewards)
      .leftJoin(rewards, eq(storeRewards.rewardId, rewards.id))
      .where(statusCondition)
      .limit(limit)
      .offset(offset);
    
    // Count total rewards matching the criteria
    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(storeRewards)
      .where(statusCondition);

    // Format the rewards for response
    const formattedRewards = result.map(({ storeReward, reward }) => ({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      type: reward.rewardTypeId, // You might want to join with reward types table to get actual type name
      value: JSON.parse(reward.value || '{}'),
      status: storeReward.status,
      earned_at: storeReward.earnedAt,
      claimed_at: storeReward.claimedAt,
      expires_at: storeReward.expiresAt
    }));

    return {
      rewards: formattedRewards,
      total: Number(countResult[0].count)
    };
  }

  /**
   * Claim a reward for a store
   * @param storeId Store ID
   * @param rewardId Reward ID
   * @returns Object indicating success or failure
   */
  async claimReward(storeId: number, rewardId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Check if the store has earned this reward
      const storeRewardResult = await this.db
        .select()
        .from(storeRewards)
        .where(
          and(
            eq(storeRewards.storeId, storeId),
            eq(storeRewards.rewardId, rewardId)
          )
        )
        .limit(1);
      
      if (!storeRewardResult.length) {
        return {
          success: false,
          message: `Reward with ID ${rewardId} not found for store ${storeId}`
        };
      }
      
      const storeReward = storeRewardResult[0];
      
      // Check if reward is already claimed
      if (storeReward.status === 'claimed') {
        return {
          success: false,
          message: 'Reward has already been claimed'
        };
      }
      
      // Check if reward is expired
      if (storeReward.status === 'expired' || 
          (storeReward.expiresAt && new Date(storeReward.expiresAt) < new Date())) {
        return {
          success: false,
          message: 'Reward has expired and cannot be claimed'
        };
      }
      
      // Update reward status to claimed
      const now = new Date().toISOString();
      await this.db
        .update(storeRewards)
        .set({
          status: 'claimed',
          claimedAt: now,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(
          and(
            eq(storeRewards.storeId, storeId),
            eq(storeRewards.rewardId, rewardId)
          )
        );
      
      // Here you would also implement the logic to deliver the reward
      // This could involve calling external services, updating store attributes, etc.
      
      return {
        success: true,
        message: 'Reward claimed successfully'
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
   * Grant a reward to a store when a mission is completed
   * @param storeId Store ID
   * @param missionId Mission ID
   * @returns Object indicating success or failure
   */
  async grantRewardForMission(storeId: number, missionId: number): Promise<{
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
      
      // Check if the store already has this reward
      const existingReward = await this.db
        .select()
        .from(storeRewards)
        .where(
          and(
            eq(storeRewards.storeId, storeId),
            eq(storeRewards.rewardId, reward.id)
          )
        )
        .limit(1);
      
      if (existingReward.length) {
        return {
          success: false,
          rewardId: reward.id,
          message: 'Store already has this reward'
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
      
      // Grant the reward to the store
      const now = new Date().toISOString();
      await this.db
        .insert(storeRewards)
        .values({
          storeId,
          rewardId: reward.id,
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
}