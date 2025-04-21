"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardRepository = void 0;
const base_repository_1 = require("./base-repository");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
/**
 * Reward Repository
 * Handles data access for the Reward entity
 */
class RewardRepository extends base_repository_1.BaseRepository {
    constructor(db) {
        super(db, "rewards");
    }
    /**
     * Find entity by ID
     * @param id Entity ID
     * @returns Entity or null if not found
     */
    async findById(id) {
        const result = await this.db
            .select()
            .from(schema_1.rewards)
            .where((0, drizzle_orm_1.eq)(schema_1.rewards.id, id))
            .limit(1);
        return result.length > 0 ? result[0] : null;
    }
    /**
     * Find all entities with pagination
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object containing items array and total count
     */
    async findAll(page = 1, limit = 10) {
        const { offset, limit: limitCount } = this.getPaginationParams(page, limit);
        const items = await this.db
            .select()
            .from(schema_1.rewards)
            .limit(limitCount)
            .offset(offset);
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.rewards);
        return {
            items: items,
            total: Number(count)
        };
    }
    /**
     * Create new entity
     * @param data Entity data
     * @returns Created entity
     */
    async create(data) {
        if (!data.missionId || !data.gameId || !data.rewardTypeId || !data.name || !data.value) {
            throw new Error('Missing required fields for reward creation');
        }
        const result = await this.db.insert(schema_1.rewards).values({
            missionId: data.missionId,
            gameId: data.gameId,
            rewardTypeId: data.rewardTypeId,
            name: data.name,
            description: data.description,
            value: data.value
        }).returning();
        return result[0];
    }
    /**
     * Update existing entity
     * @param id Entity ID
     * @param data Entity data to update
     * @returns Updated entity or null if not found
     */
    async update(id, data) {
        const result = await this.db.update(schema_1.rewards)
            .set({
            ...data,
            updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
        })
            .where((0, drizzle_orm_1.eq)(schema_1.rewards.id, id))
            .returning();
        return result.length > 0 ? result[0] : null;
    }
    /**
     * Delete entity
     * @param id Entity ID
     * @returns True if deleted, false otherwise
     */
    async delete(id) {
        const result = await this.db.delete(schema_1.rewards)
            .where((0, drizzle_orm_1.eq)(schema_1.rewards.id, id))
            .returning({ id: schema_1.rewards.id });
        return result.length > 0;
    }
    /**
     * Find rewards by mission ID
     * @param missionId Mission ID
     * @returns Array of rewards
     */
    async findByMissionId(missionId) {
        const result = await this.db
            .select()
            .from(schema_1.rewards)
            .where((0, drizzle_orm_1.eq)(schema_1.rewards.missionId, missionId));
        return result;
    }
    /**
     * Find rewards by mission ID (alias for findByMissionId)
     * @param missionId Mission ID
     * @returns Rewards array
     */
    async findByMission(missionId) {
        try {
            const result = await this.db.select()
                .from(schema_1.rewards)
                .where((0, drizzle_orm_1.eq)(schema_1.rewards.missionId, missionId));
            return result;
        }
        catch (error) {
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
    async getPlayerRewards(playerId, status) {
        const query = this.db
            .select({
            reward: schema_1.rewards,
            status: schema_1.playerRewards.status,
            earnedAt: schema_1.playerRewards.earnedAt,
            claimedAt: schema_1.playerRewards.claimedAt,
            expiresAt: schema_1.playerRewards.expiresAt
        })
            .from(schema_1.rewards)
            .innerJoin(schema_1.playerRewards, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.rewards.id, schema_1.playerRewards.rewardId), (0, drizzle_orm_1.eq)(schema_1.playerRewards.playerId, playerId)));
        if (status) {
            query.where((0, drizzle_orm_1.eq)(schema_1.playerRewards.status, status));
        }
        const result = await query;
        return result.map(item => ({
            ...item.reward,
            status: item.status,
            earnedAt: item.earnedAt,
            claimedAt: item.claimedAt,
            expiresAt: item.expiresAt
        }));
    }
    /**
     * Award a reward to a player
     * @param rewardId Reward ID
     * @param playerId Player ID
     * @param expiresAt Optional expiration date
     * @returns Boolean indicating success
     */
    async awardToPlayer(rewardId, playerId, expiresAt) {
        try {
            // Get reward to get the game ID
            const reward = await this.findById(rewardId);
            if (!reward) {
                throw new Error(`Reward with ID ${rewardId} not found`);
            }
            // Insert player reward record
            await this.db.insert(schema_1.playerRewards).values({
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
        }
        catch (error) {
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
    async markAsClaimed(rewardId, playerId) {
        try {
            const result = await this.db.update(schema_1.playerRewards)
                .set({
                status: 'claimed',
                claimedAt: new Date().toISOString(),
                updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerRewards.rewardId, rewardId), (0, drizzle_orm_1.eq)(schema_1.playerRewards.playerId, playerId), (0, drizzle_orm_1.eq)(schema_1.playerRewards.status, 'earned')))
                .returning();
            return result.length > 0;
        }
        catch (error) {
            console.error('Error marking reward as claimed:', error);
            return false;
        }
    }
    /**
     * Mark expired rewards
     * @returns Number of rewards marked as expired
     */
    async markExpiredRewards() {
        try {
            const now = new Date().toISOString();
            const result = await this.db.update(schema_1.playerRewards)
                .set({
                status: 'expired',
                updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${schema_1.playerRewards.expiresAt} IS NOT NULL`, (0, drizzle_orm_1.sql) `${schema_1.playerRewards.expiresAt} < ${now}`, (0, drizzle_orm_1.eq)(schema_1.playerRewards.status, 'earned')))
                .returning();
            return result.length;
        }
        catch (error) {
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
    async storeRewards(gameId, playerId, rewardId, status = "earned", earnedAt = new Date().toISOString(), expiresAt) {
        try {
            const result = await this.db.insert(schema_1.playerRewards)
                .values({
                gameId,
                playerId,
                rewardId,
                status: status, // Cast to literal type
                earnedAt,
                expiresAt
            })
                .returning({ id: schema_1.playerRewards.id });
            return result[0].id;
        }
        catch (error) {
            console.error("Error storing player reward:", error);
            throw error;
        }
    }
    /**
     * Grant a reward to a player
     * @param playerId Player ID
     * @param reward Reward object
     */
    async grantReward(playerId, reward) {
        const mission = await this.db
            .select()
            .from(schema_1.missions)
            .where((0, drizzle_orm_1.eq)(schema_1.missions.id, reward.missionId))
            .limit(1);
        if (!mission.length) {
            throw new Error(`Mission ${reward.missionId} not found`);
        }
        const now = new Date().toISOString();
        const gameId = mission[0].gameId;
        await this.db
            .insert(schema_1.playerRewards)
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
    async grantToPlayer(rewardId, playerId, gameId, expiresAt) {
        try {
            // Insert player reward record
            await this.db.insert(schema_1.playerRewards).values({
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
        }
        catch (error) {
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
    async createPlayerReward(playerId, reward) {
        const result = await this.db
            .insert(schema_1.playerRewards)
            .values({
            gameId: reward.gameId,
            playerId,
            rewardId: reward.id,
            status: 'earned',
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
    async grantRewardToPlayer(playerId, rewardId, gameId, status = 'earned') {
        try {
            const now = new Date().toISOString();
            // Check if the player already has this reward
            const existingReward = await this.db
                .select()
                .from(schema_1.playerRewards)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerRewards.playerId, playerId), (0, drizzle_orm_1.eq)(schema_1.playerRewards.rewardId, rewardId)))
                .limit(1);
            if (existingReward.length > 0) {
                return {
                    success: false,
                    message: 'Player already has this reward'
                };
            }
            // Grant the reward
            const result = await this.db
                .insert(schema_1.playerRewards)
                .values({
                playerId,
                rewardId,
                gameId,
                status: status, // Cast to literal type
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
        }
        catch (error) {
            console.error('Error granting reward:', error);
            throw error;
        }
    }
}
exports.RewardRepository = RewardRepository;
