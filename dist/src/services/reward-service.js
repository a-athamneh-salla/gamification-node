"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
/**
 * Reward Service
 * Handles business logic for rewards
 */
class RewardService {
    constructor(db) {
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
    async getRewardsByStore(storeId, status = 'all', page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        // Build query conditions
        const conditions = (0, drizzle_orm_1.eq)(schema_1.storeRewards.storeId, storeId);
        // Add status filter if provided
        const statusCondition = status !== 'all'
            ? (0, drizzle_orm_1.and)(conditions, (0, drizzle_orm_1.eq)(schema_1.storeRewards.status, status))
            : conditions;
        // Get rewards with their details
        const result = await this.db
            .select({
            storeReward: schema_1.storeRewards,
            reward: schema_1.rewards
        })
            .from(schema_1.storeRewards)
            .leftJoin(schema_1.rewards, (0, drizzle_orm_1.eq)(schema_1.storeRewards.rewardId, schema_1.rewards.id))
            .where(statusCondition)
            .limit(limit)
            .offset(offset);
        // Count total rewards matching the criteria
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.storeRewards)
            .where(statusCondition);
        // Format the rewards for response
        const formattedRewards = result.map(({ storeReward, reward }) => {
            if (!reward)
                return null;
            return {
                id: reward.id,
                name: reward.name,
                description: reward.description,
                type: reward.rewardTypeId,
                value: JSON.parse(reward.value || '{}'),
                status: storeReward.status,
                earned_at: storeReward.earnedAt,
                claimed_at: storeReward.claimedAt,
                expires_at: storeReward.expiresAt
            };
        }).filter(item => item !== null);
        return {
            rewards: formattedRewards,
            total: Number(countResult[0].count)
        };
    }
    /**
     * Get a specific reward for a store
     * @param storeId Store ID
     * @param rewardId Reward ID
     * @returns Reward information or null if not found
     */
    async getRewardById(storeId, rewardId) {
        const result = await this.db
            .select({
            storeReward: schema_1.storeRewards,
            reward: schema_1.rewards
        })
            .from(schema_1.storeRewards)
            .leftJoin(schema_1.rewards, (0, drizzle_orm_1.eq)(schema_1.storeRewards.rewardId, schema_1.rewards.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeRewards.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.storeRewards.rewardId, rewardId)))
            .limit(1);
        if (!result.length || !result[0].reward) {
            return null;
        }
        const { reward, storeReward } = result[0];
        return {
            id: reward.id,
            missionId: reward.missionId,
            rewardTypeId: reward.rewardTypeId,
            name: reward.name,
            description: reward.description || undefined,
            value: reward.value,
            status: storeReward.status,
            earnedAt: storeReward.earnedAt || undefined,
            claimedAt: storeReward.claimedAt || undefined,
            expiresAt: storeReward.expiresAt || undefined,
            createdAt: reward.createdAt,
            updatedAt: reward.updatedAt
        };
    }
    /**
     * Claim a reward for a store
     * @param storeId Store ID
     * @param rewardId Reward ID
     * @returns Object indicating success or failure
     */
    async claimReward(storeId, rewardId) {
        try {
            // Check if the store has earned this reward
            const storeRewardResult = await this.db
                .select()
                .from(schema_1.storeRewards)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeRewards.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.storeRewards.rewardId, rewardId)))
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
                .update(schema_1.storeRewards)
                .set({
                status: 'claimed',
                claimedAt: now,
                updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeRewards.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.storeRewards.rewardId, rewardId)));
            // Get the updated reward
            const reward = await this.getRewardById(storeId, rewardId);
            return {
                success: true,
                message: 'Reward claimed successfully',
                reward: reward || undefined
            };
        }
        catch (error) {
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
    async grantRewardForMission(storeId, missionId) {
        try {
            // Find the reward for this mission
            const rewardResult = await this.db
                .select()
                .from(schema_1.rewards)
                .where((0, drizzle_orm_1.eq)(schema_1.rewards.missionId, missionId))
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
                .from(schema_1.storeRewards)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeRewards.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.storeRewards.rewardId, reward.id)))
                .limit(1);
            if (existingReward.length) {
                return {
                    success: false,
                    rewardId: reward.id,
                    message: 'Store already has this reward'
                };
            }
            // Determine expiration date if applicable
            let expiresAt;
            const rewardValue = JSON.parse(reward.value || '{}');
            if (rewardValue.expirationDays) {
                const expirationDate = new Date();
                expirationDate.setDate(expirationDate.getDate() + rewardValue.expirationDays);
                expiresAt = expirationDate.toISOString();
            }
            // Grant the reward to the store
            const now = new Date().toISOString();
            await this.db
                .insert(schema_1.storeRewards)
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
        }
        catch (error) {
            console.error('Error granting reward:', error);
            return {
                success: false,
                message: `Error granting reward: ${error.message}`
            };
        }
    }
}
exports.RewardService = RewardService;
