"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const base_repository_1 = require("./base-repository");
const schema_1 = require("../db/schema");
/**
 * Game Repository
 * Handles data access for the Game entity
 */
class GameRepository extends base_repository_1.BaseRepository {
    constructor(db) {
        super(db, 'games');
    }
    /**
     * Create a new game
     * @param data Game data
     * @returns Created game
     */
    async create(data) {
        const result = await this.db
            .insert(schema_1.games)
            .values({
            name: data.name,
            description: data.description,
            isActive: data.isActive ?? true,
            startDate: data.startDate,
            endDate: data.endDate,
            targetType: (data.targetType ?? 'all'),
            targetPlayers: data.targetPlayers
        })
            .returning();
        return result[0];
    }
    /**
     * Find a game by its ID
     * @param id Game ID
     * @returns Game or null if not found
     */
    async findById(id) {
        const result = await this.db
            .select()
            .from(schema_1.games)
            .where((0, drizzle_orm_1.eq)(schema_1.games.id, id))
            .limit(1);
        return result.length ? result[0] : null;
    }
    /**
     * Get all games with pagination
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object containing games and total count
     */
    async findAll(page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        const result = await this.db
            .select()
            .from(schema_1.games)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.games.createdAt))
            .limit(limitParam)
            .offset(offset);
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.games);
        return {
            items: result,
            total: Number(countResult[0].count)
        };
    }
    /**
     * Get games available to a specific player
     * @param playerId Player ID
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object containing games and total count
     */
    async findByPlayer(playerId, page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        // First get player details
        const playerResult = await this.db
            .select()
            .from(schema_1.players)
            .where((0, drizzle_orm_1.eq)(schema_1.players.id, playerId))
            .limit(1);
        if (!playerResult.length) {
            return { games: [], total: 0 };
        }
        // Find games available to this player based on target criteria
        const result = await this.db
            .select()
            .from(schema_1.games)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.games.targetType, 'all'), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.games.targetType, 'specific'), (0, drizzle_orm_1.sql) `json_extract(${schema_1.games.targetPlayers}, '$') LIKE '%${playerId}%'`), 
        // For filtered type, we would need more complex logic based on player attributes
        // For now, we'll assume all filtered games are accessible
        (0, drizzle_orm_1.eq)(schema_1.games.targetType, 'filtered')))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.games.isActive, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.sql) `${schema_1.games.startDate} IS NULL`, (0, drizzle_orm_1.sql) `${schema_1.games.startDate} <= CURRENT_TIMESTAMP`), (0, drizzle_orm_1.or)((0, drizzle_orm_1.sql) `${schema_1.games.endDate} IS NULL`, (0, drizzle_orm_1.sql) `${schema_1.games.endDate} >= CURRENT_TIMESTAMP`)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.games.createdAt))
            .limit(limitParam)
            .offset(offset);
        // Count total accessible games
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.games)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.games.targetType, 'all'), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.games.targetType, 'specific'), (0, drizzle_orm_1.sql) `json_extract(${schema_1.games.targetPlayers}, '$') LIKE '%${playerId}%'`), (0, drizzle_orm_1.eq)(schema_1.games.targetType, 'filtered')))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.games.isActive, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.sql) `${schema_1.games.startDate} IS NULL`, (0, drizzle_orm_1.sql) `${schema_1.games.startDate} <= CURRENT_TIMESTAMP`), (0, drizzle_orm_1.or)((0, drizzle_orm_1.sql) `${schema_1.games.endDate} IS NULL`, (0, drizzle_orm_1.sql) `${schema_1.games.endDate} >= CURRENT_TIMESTAMP`)));
        return {
            games: result,
            total: Number(countResult[0].count)
        };
    }
    /**
     * Update a game
     * @param id Game ID
     * @param data Game data to update
     * @returns Updated game
     */
    async update(id, data) {
        const result = await this.db
            .update(schema_1.games)
            .set({
            ...data,
            updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
        })
            .where((0, drizzle_orm_1.eq)(schema_1.games.id, id))
            .returning();
        return result.length ? result[0] : null;
    }
    /**
     * Delete a game
     * @param id Game ID
     * @returns Boolean indicating success
     */
    async delete(id) {
        const result = await this.db
            .delete(schema_1.games)
            .where((0, drizzle_orm_1.eq)(schema_1.games.id, id))
            .returning({ id: schema_1.games.id });
        return result.length > 0;
    }
    /**
     * Grant access to a game for a player
     * @param gameId Game ID
     * @param playerId Player ID
     * @returns Boolean indicating success
     */
    async grantAccessToPlayer(gameId, playerId) {
        // Update the game's targetPlayers to include this player
        const game = await this.findById(gameId);
        if (!game) {
            return false;
        }
        let targetPlayers = [];
        if (game.targetPlayers) {
            try {
                targetPlayers = JSON.parse(game.targetPlayers);
            }
            catch (e) {
                targetPlayers = [];
            }
        }
        // Add player if not already in the list
        if (!targetPlayers.includes(playerId)) {
            targetPlayers.push(playerId);
        }
        // Update the game
        const result = await this.update(gameId, {
            targetType: 'specific',
            targetPlayers: JSON.stringify(targetPlayers)
        });
        return !!result;
    }
    /**
     * Revoke access to a game for a player
     * @param gameId Game ID
     * @param playerId Player ID
     * @returns Boolean indicating success
     */
    async revokeAccessFromPlayer(gameId, playerId) {
        // Update the game's targetPlayers to remove this player
        const game = await this.findById(gameId);
        if (!game) {
            return false;
        }
        let targetPlayers = [];
        if (game.targetPlayers) {
            try {
                targetPlayers = JSON.parse(game.targetPlayers);
            }
            catch (e) {
                targetPlayers = [];
            }
        }
        // Remove player if in the list
        targetPlayers = targetPlayers.filter(id => id !== playerId);
        // Update the game
        const result = await this.update(gameId, {
            targetPlayers: JSON.stringify(targetPlayers)
        });
        return !!result;
    }
}
exports.GameRepository = GameRepository;
