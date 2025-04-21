"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const base_repository_1 = require("./base-repository");
const schema_1 = require("../db/schema");
/**
 * Player Repository
 * Handles data access for the Player entity
 */
class PlayerRepository extends base_repository_1.BaseRepository {
    constructor(db) {
        super(db, 'players');
    }
    /**
     * Find a player by their ID
     * @param id Player ID
     * @returns Player or null if not found
     */
    async findById(id) {
        const result = await this.db
            .select()
            .from(schema_1.players)
            .where((0, drizzle_orm_1.eq)(schema_1.players.id, id))
            .limit(1);
        return result.length ? result[0] : null;
    }
    /**
     * Find a player by their external ID (usually from Salla)
     * @param externalId External player ID
     * @returns Player or null if not found
     */
    async findByExternalId(externalId) {
        const result = await this.db
            .select()
            .from(schema_1.players)
            .where((0, drizzle_orm_1.eq)(schema_1.players.externalId, externalId))
            .limit(1);
        return result.length ? result[0] : null;
    }
    /**
     * Get all players with pagination
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object containing players and total count
     */
    async findAll(page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        const result = await this.db
            .select()
            .from(schema_1.players)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.players.createdAt))
            .limit(limitParam)
            .offset(offset);
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.players);
        return {
            items: result,
            total: Number(countResult[0].count)
        };
    }
    /**
     * Create a new player
     * @param data Player data
     * @returns Created player
     */
    async create(data) {
        const result = await this.db
            .insert(schema_1.players)
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
        return result[0];
    }
    /**
     * Update an existing player
     * @param id Player ID
     * @param data Data to update
     * @returns Updated player
     */
    async update(id, data) {
        const result = await this.db
            .update(schema_1.players)
            .set({
            ...data,
            updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
        })
            .where((0, drizzle_orm_1.eq)(schema_1.players.id, id))
            .returning();
        return result[0];
    }
    /**
     * Delete a player
     * @param id Player ID
     * @returns Boolean indicating success
     */
    async delete(id) {
        const result = await this.db
            .delete(schema_1.players)
            .where((0, drizzle_orm_1.eq)(schema_1.players.id, id))
            .returning({ id: schema_1.players.id });
        return result.length > 0;
    }
    /**
     * Get a player by their external ID or create one if not found
     * @param externalId External player ID
     * @param name Player name
     * @param email Optional player email
     * @returns Player (existing or newly created)
     */
    async getOrCreateByExternalId(externalId, name, email) {
        // Try to find existing player
        const existingPlayer = await this.findByExternalId(externalId);
        if (existingPlayer) {
            return existingPlayer;
        }
        // Create new player
        const result = await this.db
            .insert(schema_1.players)
            .values({
            externalId,
            name,
            email,
        })
            .returning();
        return result[0];
    }
    /**
     * Search for players by name or email
     * @param searchTerm Search term
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object containing players and total count
     */
    async search(searchTerm, page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        const searchPattern = `%${searchTerm}%`;
        const result = await this.db
            .select()
            .from(schema_1.players)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.sql) `${schema_1.players.name} LIKE ${searchPattern}`, (0, drizzle_orm_1.sql) `${schema_1.players.email} LIKE ${searchPattern}`, (0, drizzle_orm_1.sql) `${schema_1.players.externalId} LIKE ${searchPattern}`))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.players.createdAt))
            .limit(limitParam)
            .offset(offset);
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.players)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.sql) `${schema_1.players.name} LIKE ${searchPattern}`, (0, drizzle_orm_1.sql) `${schema_1.players.email} LIKE ${searchPattern}`, (0, drizzle_orm_1.sql) `${schema_1.players.externalId} LIKE ${searchPattern}`));
        return {
            items: result,
            total: Number(countResult[0].count)
        };
    }
    /**
     * Update player points
     * @param id Player ID
     * @param points Points to add
     * @returns Updated player
     */
    async updatePoints(id, points) {
        try {
            const result = await this.db
                .update(schema_1.players)
                .set({
                totalPoints: (0, drizzle_orm_1.sql) `${schema_1.players.totalPoints} + ${points}`,
                updatedAt: new Date().toISOString()
            })
                .where((0, drizzle_orm_1.eq)(schema_1.players.id, id))
                .returning();
            return result.length > 0 ? result[0] : null;
        }
        catch (error) {
            console.error('Error updating player points:', error);
            return null;
        }
    }
    /**
     * Add points to a player
     * @param playerId Player ID
     * @param points Points to add
     */
    async addPoints(playerId, points) {
        await this.db.update(schema_1.players)
            .set({
            points: (0, drizzle_orm_1.sql) `${schema_1.players.points} + ${points}`,
            totalPoints: (0, drizzle_orm_1.sql) `${schema_1.players.totalPoints} + ${points}`,
            updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
        })
            .where((0, drizzle_orm_1.eq)(schema_1.players.id, playerId));
    }
    /**
     * Set points for a player
     * @param playerId Player ID
     * @param points Points to set
     */
    async setPoints(playerId, points) {
        await this.db.update(schema_1.players)
            .set({
            points: points,
            updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
        })
            .where((0, drizzle_orm_1.eq)(schema_1.players.id, playerId));
    }
    /**
     * Update player progress with their latest achievements
     * @param playerId Player ID
     * @param progress Object containing pointsEarned, tasksCompleted, and missionsCompleted
     */
    async updateProgress(playerId, { pointsEarned = 0, tasksCompleted = 0, missionsCompleted = 0 }) {
        await this.db.update(schema_1.players)
            .set({
            points: (0, drizzle_orm_1.sql) `${schema_1.players.points} + ${pointsEarned}`,
            totalPoints: (0, drizzle_orm_1.sql) `${schema_1.players.totalPoints} + ${pointsEarned}`,
            tasksCompleted: (0, drizzle_orm_1.sql) `${schema_1.players.tasksCompleted} + ${tasksCompleted}`,
            missionsCompleted: (0, drizzle_orm_1.sql) `${schema_1.players.missionsCompleted} + ${missionsCompleted}`,
            updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
        })
            .where((0, drizzle_orm_1.eq)(schema_1.players.id, playerId));
    }
    /**
     * Get or create a player by store ID
     * @param storeId Store ID to use as player ID
     * @param externalId Optional external ID
     * @returns Created or found player
     */
    async getOrCreatePlayer(storeId, externalId) {
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
    async getPlayerRewards(playerId) {
        const result = await this.db
            .select()
            .from(schema_1.playerRewards)
            .leftJoin(schema_1.rewards, (0, drizzle_orm_1.eq)(schema_1.playerRewards.rewardId, schema_1.rewards.id))
            .where((0, drizzle_orm_1.eq)(schema_1.playerRewards.playerId, playerId));
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
            };
        });
    }
    /**
     * Grant a reward to a player
     * @param playerId Player ID
     * @param rewardId Reward ID
     * @param gameId Game ID
     * @param status Reward status
     */
    async grantRewardToPlayer(playerId, rewardId, gameId, status = 'earned') {
        const now = new Date().toISOString();
        await this.db
            .insert(schema_1.playerRewards)
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
exports.PlayerRepository = PlayerRepository;
