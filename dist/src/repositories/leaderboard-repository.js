"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardRepository = void 0;
const base_repository_1 = require("./base-repository");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
class LeaderboardRepository extends base_repository_1.BaseRepository {
    constructor(db) {
        super(db, "leaderboard");
    }
    /**
     * Find entity by ID
     * @param id Entity ID
     * @returns Entity or null if not found
     */
    async findById(id) {
        const result = await this.db
            .select()
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.id, id))
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
            .from(schema_1.leaderboard)
            .limit(limitCount)
            .offset(offset);
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.leaderboard);
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
        const now = new Date().toISOString();
        const result = await this.db.insert(schema_1.leaderboard).values({
            playerId: data.playerId,
            gameId: data.gameId,
            totalPoints: data.totalPoints || 0,
            completedMissions: data.completedMissions || 0,
            completedTasks: data.completedTasks || 0,
            rank: data.rank,
            createdAt: now,
            updatedAt: now
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
        const now = new Date().toISOString();
        const result = await this.db.update(schema_1.leaderboard)
            .set({
            ...data,
            updatedAt: now
        })
            .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.id, id))
            .returning();
        return result.length > 0 ? result[0] : null;
    }
    /**
     * Delete entity
     * @param id Entity ID
     * @returns True if deleted, false otherwise
     */
    async delete(id) {
        const result = await this.db.delete(schema_1.leaderboard)
            .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.id, id))
            .returning({ id: schema_1.leaderboard.id });
        return result.length > 0;
    }
    /**
     * Get the current leaderboard for a game
     * @param gameId The ID of the game
     * @param page Page number for pagination
     * @param limit Number of entries to return
     */
    async getLeaderboard(gameId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        // Query for leaderboard entries with player information
        const entries = await this.db
            .select({
            id: schema_1.leaderboard.id,
            playerId: schema_1.leaderboard.playerId,
            gameId: schema_1.leaderboard.gameId,
            totalPoints: schema_1.leaderboard.totalPoints,
            completedMissions: schema_1.leaderboard.completedMissions,
            completedTasks: schema_1.leaderboard.completedTasks,
            rank: schema_1.leaderboard.rank,
            updatedAt: schema_1.leaderboard.updatedAt,
            playerName: schema_1.players.name,
            playerExternalId: schema_1.players.externalId,
            playerEmail: schema_1.players.email,
        })
            .from(schema_1.leaderboard)
            .leftJoin(schema_1.players, (0, drizzle_orm_1.eq)(schema_1.leaderboard.playerId, schema_1.players.id))
            .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.gameId, gameId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.leaderboard.totalPoints))
            .limit(limit)
            .offset(offset);
        // Get the total count for pagination
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.gameId, gameId));
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
    async getGameLeaderboard(gameId, page = 1, limit = 10) {
        return this.getLeaderboard(gameId, page, limit);
    }
    /**
     * Get the statistics for a leaderboard
     * @param gameId The ID of the game
     */
    async getLeaderboardStats(gameId) {
        const [stats] = await this.db
            .select({
            totalPlayers: (0, drizzle_orm_1.sql) `count(*)`,
            topScore: (0, drizzle_orm_1.sql) `MAX(${schema_1.leaderboard.totalPoints})`,
            avgScore: (0, drizzle_orm_1.sql) `AVG(${schema_1.leaderboard.totalPoints})`,
            totalMissions: (0, drizzle_orm_1.sql) `SUM(${schema_1.leaderboard.completedMissions})`,
            totalTasks: (0, drizzle_orm_1.sql) `SUM(${schema_1.leaderboard.completedTasks})`,
        })
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.gameId, gameId));
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
    async getTopPlayers(gameId, count = 10) {
        const entries = await this.db
            .select({
            id: schema_1.leaderboard.id,
            playerId: schema_1.leaderboard.playerId,
            gameId: schema_1.leaderboard.gameId,
            totalPoints: schema_1.leaderboard.totalPoints,
            completedMissions: schema_1.leaderboard.completedMissions,
            completedTasks: schema_1.leaderboard.completedTasks,
            rank: schema_1.leaderboard.rank,
            updatedAt: schema_1.leaderboard.updatedAt,
        })
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.gameId, gameId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.leaderboard.totalPoints))
            .limit(count);
        return entries;
    }
    /**
     * Update player statistics on the leaderboard
     */
    async updatePlayerStats(playerId, gameId, stats) {
        const existing = await this.db
            .select()
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.leaderboard.playerId, playerId), (0, drizzle_orm_1.eq)(schema_1.leaderboard.gameId, gameId)))
            .limit(1);
        const now = new Date().toISOString();
        if (existing.length > 0) {
            // Update existing entry
            const updateData = { updatedAt: now };
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
                .update(schema_1.leaderboard)
                .set(updateData)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.leaderboard.playerId, playerId), (0, drizzle_orm_1.eq)(schema_1.leaderboard.gameId, gameId)));
        }
        else {
            // Create new entry
            await this.db.insert(schema_1.leaderboard).values({
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
    async recalculateRanks(gameId) {
        // This is a simplified approach. In a production environment with large datasets,
        // you might want to use a more efficient approach or a batch process.
        const entries = await this.db
            .select()
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.gameId, gameId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.leaderboard.totalPoints));
        let updatedCount = 0;
        // Update ranks for all entries
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const newRank = i + 1;
            if (entry.rank !== newRank) {
                await this.db
                    .update(schema_1.leaderboard)
                    .set({ rank: newRank })
                    .where((0, drizzle_orm_1.eq)(schema_1.leaderboard.id, entry.id));
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
    async getPlayerRanking(playerId, gameId) {
        const rankData = await this.db
            .select({
            playerId: schema_1.leaderboard.playerId,
            gameId: schema_1.leaderboard.gameId,
            totalPoints: schema_1.leaderboard.totalPoints,
            rank: schema_1.leaderboard.rank,
            updatedAt: schema_1.leaderboard.updatedAt
        })
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.leaderboard.playerId, playerId), (0, drizzle_orm_1.eq)(schema_1.leaderboard.gameId, gameId)))
            .limit(1);
        if (!rankData.length) {
            return null;
        }
        const entry = rankData[0];
        // Get player details
        const playerData = await this.db
            .select()
            .from(schema_1.players)
            .where((0, drizzle_orm_1.eq)(schema_1.players.id, playerId))
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
    async getNearbyPlayers(playerId, gameId, range = 3) {
        const playerRank = await this.getPlayerRanking(playerId, gameId);
        if (!playerRank) {
            return [];
        }
        const minRank = Math.max(1, playerRank.rank - range);
        const maxRank = playerRank.rank + range;
        const rankData = await this.db
            .select({
            playerId: schema_1.leaderboard.playerId,
            gameId: schema_1.leaderboard.gameId,
            totalPoints: schema_1.leaderboard.totalPoints,
            rank: schema_1.leaderboard.rank,
            updatedAt: schema_1.leaderboard.updatedAt
        })
            .from(schema_1.leaderboard)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.leaderboard.gameId, gameId), (0, drizzle_orm_1.sql) `${schema_1.leaderboard.rank} >= ${minRank}`, (0, drizzle_orm_1.sql) `${schema_1.leaderboard.rank} <= ${maxRank}`))
            .orderBy(schema_1.leaderboard.rank);
        // Get player details for all nearby players
        const playerIds = rankData.map(entry => entry.playerId);
        if (playerIds.length === 0) {
            return [];
        }
        const playerData = await this.db
            .select()
            .from(schema_1.players)
            .where((0, drizzle_orm_1.sql) `${schema_1.players.id} IN (${playerIds.join(',')})`);
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
exports.LeaderboardRepository = LeaderboardRepository;
