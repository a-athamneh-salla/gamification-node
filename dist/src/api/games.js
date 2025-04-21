"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const zod_1 = require("zod");
const game_repository_1 = require("../repositories/game-repository");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Create the games router
exports.gameRoutes = new hono_1.Hono();
/**
 * GET /api/games
 * Get all games with optional pagination
 */
exports.gameRoutes.get('/', async (c) => {
    try {
        const db = c.get('db');
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '10');
        const gameRepository = new game_repository_1.GameRepository(db);
        const { items, total } = await gameRepository.findAll(page, limit);
        return c.json({
            success: true,
            data: items,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Error retrieving games:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve games',
        }, 500);
    }
});
/**
 * GET /api/games/:id
 * Get a specific game by ID
 */
exports.gameRoutes.get('/:id', async (c) => {
    try {
        const db = c.get('db');
        const gameId = parseInt(c.req.param('id'));
        if (isNaN(gameId)) {
            return c.json({
                success: false,
                message: 'Invalid game ID'
            }, 400);
        }
        const gameRepository = new game_repository_1.GameRepository(db);
        const game = await gameRepository.findById(gameId);
        if (!game) {
            return c.json({
                success: false,
                message: 'Game not found'
            }, 404);
        }
        return c.json({
            success: true,
            data: game
        });
    }
    catch (error) {
        console.error('Error retrieving game:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve game',
        }, 500);
    }
});
// Define game creation schema for validation
const createGameSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    is_active: zod_1.z.boolean().default(true),
    start_date: zod_1.z.string().optional(),
    end_date: zod_1.z.string().optional(),
    target_type: zod_1.z.enum(['all', 'specific', 'filtered']).default('all'),
    target_players: zod_1.z.string().optional() // JSON string for player IDs or filter criteria
});
/**
 * POST /api/games
 * Create a new game (admin only)
 */
exports.gameRoutes.post('/', (0, zod_validator_1.zValidator)('json', createGameSchema), async (c) => {
    try {
        const db = c.get('db');
        const data = c.req.valid('json');
        // This would typically have authentication/authorization checks
        // to ensure only admin users can create games
        const result = await db.insert(schema_1.games).values({
            name: data.name,
            description: data.description,
            isActive: data.is_active,
            startDate: data.start_date,
            endDate: data.end_date,
            targetType: data.target_type,
            targetPlayers: data.target_players
        }).returning();
        return c.json({
            success: true,
            message: 'Game created successfully',
            data: result[0]
        });
    }
    catch (error) {
        console.error('Error creating game:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to create game',
        }, 500);
    }
});
/**
 * GET /api/games/player/:playerId
 * Get all games available for a specific player
 */
exports.gameRoutes.get('/player/:playerId', async (c) => {
    try {
        const db = c.get('db');
        const playerId = parseInt(c.req.param('playerId'));
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '10');
        if (isNaN(playerId)) {
            return c.json({
                success: false,
                message: 'Invalid player ID'
            }, 400);
        }
        const gameRepository = new game_repository_1.GameRepository(db);
        const { games, total } = await gameRepository.findByPlayer(playerId, page, limit);
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
        console.error('Error retrieving games for player:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve games for player',
        }, 500);
    }
});
/**
 * GET /api/games/:id/missions
 * Get all missions for a specific game
 */
exports.gameRoutes.get('/:id/missions', async (c) => {
    try {
        const db = c.get('db');
        const gameId = parseInt(c.req.param('id'));
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '10');
        if (isNaN(gameId)) {
            return c.json({
                success: false,
                message: 'Invalid game ID'
            }, 400);
        }
        const missionsResult = await db
            .select()
            .from(schema_1.missions)
            .where((0, drizzle_orm_1.eq)(schema_1.missions.gameId, gameId))
            .limit(limit)
            .offset((page - 1) * limit);
        const countResult = await db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.missions)
            .where((0, drizzle_orm_1.eq)(schema_1.missions.gameId, gameId));
        const total = Number(countResult[0].count);
        return c.json({
            success: true,
            data: missionsResult,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Error retrieving game missions:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve game missions',
        }, 500);
    }
});
/**
 * PUT /api/games/:id
 * Update a game (admin only)
 */
exports.gameRoutes.put('/:id', (0, zod_validator_1.zValidator)('json', createGameSchema.partial()), async (c) => {
    try {
        const db = c.get('db');
        const gameId = parseInt(c.req.param('id'));
        const data = c.req.valid('json');
        if (isNaN(gameId)) {
            return c.json({
                success: false,
                message: 'Invalid game ID'
            }, 400);
        }
        const gameRepository = new game_repository_1.GameRepository(db);
        const game = await gameRepository.findById(gameId);
        if (!game) {
            return c.json({
                success: false,
                message: 'Game not found'
            }, 404);
        }
        const updatedGame = await gameRepository.update(gameId, {
            name: data.name,
            description: data.description,
            isActive: data.is_active,
            startDate: data.start_date,
            endDate: data.end_date,
            targetType: data.target_type,
            targetPlayers: data.target_players
        });
        return c.json({
            success: true,
            message: 'Game updated successfully',
            data: updatedGame
        });
    }
    catch (error) {
        console.error('Error updating game:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to update game',
        }, 500);
    }
});
