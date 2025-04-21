"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerRoutes = void 0;
const hono_1 = require("hono");
const player_repository_1 = require("../repositories/player-repository");
const game_repository_1 = require("../repositories/game-repository");
const leaderboard_repository_1 = require("../repositories/leaderboard-repository");
const mission_repository_1 = require("../repositories/mission-repository");
// Create the players router
exports.playerRoutes = new hono_1.Hono();
/**
 * GET /api/players
 * List all players with pagination
 */
exports.playerRoutes.get('/', async (c) => {
    try {
        const db = c.get('db');
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '10');
        const search = c.req.query('q');
        const playerRepo = new player_repository_1.PlayerRepository(db);
        let result;
        if (search) {
            result = await playerRepo.search(search, page, limit);
        }
        else {
            result = await playerRepo.findAll(page, limit);
        }
        return c.json({
            success: true,
            data: result.items,
            pagination: {
                page,
                limit,
                total: result.total,
                pages: Math.ceil(result.total / limit)
            }
        });
    }
    catch (error) {
        console.error('Error retrieving players:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve players',
        }, 500);
    }
});
/**
 * GET /api/players/:id
 * Get a single player by ID
 */
exports.playerRoutes.get('/:id', async (c) => {
    try {
        const db = c.get('db');
        const id = parseInt(c.req.param('id'));
        if (isNaN(id)) {
            return c.json({
                success: false,
                message: 'Invalid player ID'
            }, 400);
        }
        const playerRepo = new player_repository_1.PlayerRepository(db);
        const player = await playerRepo.findById(id);
        if (!player) {
            return c.json({
                success: false,
                message: 'Player not found'
            }, 404);
        }
        return c.json({
            success: true,
            data: player
        });
    }
    catch (error) {
        console.error('Error retrieving player:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve player',
        }, 500);
    }
});
/**
 * POST /api/players
 * Create a new player
 */
exports.playerRoutes.post('/', async (c) => {
    try {
        const db = c.get('db');
        const body = await c.req.json();
        // Validate body
        if (!body.externalId || !body.name) {
            return c.json({
                success: false,
                message: 'External ID and name are required'
            }, 400);
        }
        const playerRepo = new player_repository_1.PlayerRepository(db);
        // Check if player with this external ID already exists
        const existingPlayer = await playerRepo.findByExternalId(body.externalId);
        if (existingPlayer) {
            return c.json({
                success: false,
                message: 'A player with this external ID already exists',
                data: existingPlayer
            }, 409); // Conflict
        }
        // Create new player
        const player = await playerRepo.create({
            externalId: body.externalId,
            name: body.name,
            email: body.email,
            metadata: body.metadata || null
        });
        return c.json({
            success: true,
            message: 'Player created successfully',
            data: player
        }, 201); // Created
    }
    catch (error) {
        console.error('Error creating player:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to create player',
        }, 500);
    }
});
/**
 * PUT /api/players/:id
 * Update a player
 */
exports.playerRoutes.put('/:id', async (c) => {
    try {
        const db = c.get('db');
        const id = parseInt(c.req.param('id'));
        const body = await c.req.json();
        if (isNaN(id)) {
            return c.json({
                success: false,
                message: 'Invalid player ID'
            }, 400);
        }
        const playerRepo = new player_repository_1.PlayerRepository(db);
        const existingPlayer = await playerRepo.findById(id);
        if (!existingPlayer) {
            return c.json({
                success: false,
                message: 'Player not found'
            }, 404);
        }
        // Update player
        const updatedPlayer = await playerRepo.update(id, {
            name: body.name || existingPlayer.name,
            email: body.email || existingPlayer.email,
            metadata: body.metadata || existingPlayer.metadata
        });
        return c.json({
            success: true,
            message: 'Player updated successfully',
            data: updatedPlayer
        });
    }
    catch (error) {
        console.error('Error updating player:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to update player',
        }, 500);
    }
});
/**
 * DELETE /api/players/:id
 * Delete a player
 */
exports.playerRoutes.delete('/:id', async (c) => {
    try {
        const db = c.get('db');
        const id = parseInt(c.req.param('id'));
        if (isNaN(id)) {
            return c.json({
                success: false,
                message: 'Invalid player ID'
            }, 400);
        }
        const playerRepo = new player_repository_1.PlayerRepository(db);
        const existingPlayer = await playerRepo.findById(id);
        if (!existingPlayer) {
            return c.json({
                success: false,
                message: 'Player not found'
            }, 404);
        }
        // Delete player
        await playerRepo.delete(id);
        return c.json({
            success: true,
            message: 'Player deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting player:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to delete player',
        }, 500);
    }
});
/**
 * GET /api/players/:id/games
 * Get games associated with a player
 */
exports.playerRoutes.get('/:id/games', async (c) => {
    try {
        const db = c.get('db');
        const id = parseInt(c.req.param('id'));
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '10');
        if (isNaN(id)) {
            return c.json({
                success: false,
                message: 'Invalid player ID'
            }, 400);
        }
        const playerRepo = new player_repository_1.PlayerRepository(db);
        const existingPlayer = await playerRepo.findById(id);
        if (!existingPlayer) {
            return c.json({
                success: false,
                message: 'Player not found'
            }, 404);
        }
        const gameRepo = new game_repository_1.GameRepository(db);
        const { games, total } = await gameRepo.findByPlayer(id, page, limit);
        return c.json({
            success: true,
            data: games,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Error retrieving player games:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve player games',
        }, 500);
    }
});
/**
 * GET /api/players/:id/missions
 * Get a player's missions across all games or filtered by game
 */
exports.playerRoutes.get('/:id/missions', async (c) => {
    try {
        const db = c.get('db');
        const id = parseInt(c.req.param('id'));
        const gameIdString = c.req.query('gameId');
        const gameId = gameIdString ? parseInt(gameIdString) : undefined;
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '10');
        const status = c.req.query('status'); // 'completed', 'in_progress', or null for all
        if (isNaN(id)) {
            return c.json({
                success: false,
                message: 'Invalid player ID'
            }, 400);
        }
        if (gameIdString && isNaN(gameId)) {
            return c.json({
                success: false,
                message: 'Invalid game ID'
            }, 400);
        }
        const playerRepo = new player_repository_1.PlayerRepository(db);
        const existingPlayer = await playerRepo.findById(id);
        if (!existingPlayer) {
            return c.json({
                success: false,
                message: 'Player not found'
            }, 404);
        }
        const missionRepo = new mission_repository_1.MissionRepository(db);
        let result;
        if (gameId) {
            result = await missionRepo.findByPlayerAndGame(id, gameId, status, page, limit);
        }
        else {
            result = await missionRepo.findByPlayer(id, status, page, limit);
        }
        return c.json({
            success: true,
            data: result.missions,
            pagination: {
                page,
                limit,
                total: result.total,
                pages: Math.ceil(result.total / limit)
            }
        });
    }
    catch (error) {
        console.error('Error retrieving player missions:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve player missions',
        }, 500);
    }
});
/**
 * GET /api/players/:id/leaderboard/:gameId
 * Get a player's ranking and nearby players in a game's leaderboard
 */
exports.playerRoutes.get('/:id/leaderboard/:gameId', async (c) => {
    try {
        const db = c.get('db');
        const playerId = parseInt(c.req.param('id'));
        const gameId = parseInt(c.req.param('gameId'));
        const range = parseInt(c.req.query('range') || '3');
        if (isNaN(playerId)) {
            return c.json({
                success: false,
                message: 'Invalid player ID'
            }, 400);
        }
        if (isNaN(gameId)) {
            return c.json({
                success: false,
                message: 'Invalid game ID'
            }, 400);
        }
        const playerRepo = new player_repository_1.PlayerRepository(db);
        const existingPlayer = await playerRepo.findById(playerId);
        if (!existingPlayer) {
            return c.json({
                success: false,
                message: 'Player not found'
            }, 404);
        }
        const leaderboardRepo = new leaderboard_repository_1.LeaderboardRepository(db);
        const playerRank = await leaderboardRepo.getPlayerRanking(playerId, gameId);
        if (!playerRank) {
            return c.json({
                success: false,
                message: 'Player not found on leaderboard'
            }, 404);
        }
        const nearbyPlayers = await leaderboardRepo.getNearbyPlayers(playerId, gameId, range);
        return c.json({
            success: true,
            data: {
                player: playerRank,
                nearby: nearbyPlayers
            }
        });
    }
    catch (error) {
        console.error('Error retrieving player leaderboard data:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve player leaderboard data',
        }, 500);
    }
});
/**
 * GET /api/players/external/:externalId
 * Get a player by external ID
 */
exports.playerRoutes.get('/external/:externalId', async (c) => {
    try {
        const db = c.get('db');
        const externalId = c.req.param('externalId');
        const playerRepo = new player_repository_1.PlayerRepository(db);
        const player = await playerRepo.findByExternalId(externalId);
        if (!player) {
            return c.json({
                success: false,
                message: 'Player not found'
            }, 404);
        }
        return c.json({
            success: true,
            data: player
        });
    }
    catch (error) {
        console.error('Error retrieving player by external ID:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve player',
        }, 500);
    }
});
