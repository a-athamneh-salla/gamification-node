import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { GameRepository } from '../repositories/game-repository';
import { DB } from '../db';
import { TargetType } from '../types';
import { games, missions } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

// Create the games router
export const gameRoutes = new Hono<{
  Variables: {
    db: DB;
  };
}>();

/**
 * GET /api/games
 * Get all games with optional pagination
 */
gameRoutes.get('/', async (c) => {
  try {
    const db = c.get('db');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    
    const gameRepository = new GameRepository(db);
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
  } catch (error: any) {
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
gameRoutes.get('/:id', async (c) => {
  try {
    const db = c.get('db');
    const gameId = parseInt(c.req.param('id'));
    
    if (isNaN(gameId)) {
      return c.json({
        success: false,
        message: 'Invalid game ID'
      }, 400);
    }
    
    const gameRepository = new GameRepository(db);
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
  } catch (error: any) {
    console.error('Error retrieving game:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to retrieve game',
    }, 500);
  }
});

// Define game creation schema for validation
const createGameSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  target_type: z.enum(['all', 'specific', 'filtered']).default('all'),
  target_players: z.string().optional() // JSON string for player IDs or filter criteria
});

/**
 * POST /api/games
 * Create a new game (admin only)
 */
gameRoutes.post('/', zValidator('json', createGameSchema), async (c) => {
  try {
    const db = c.get('db');
    const data = c.req.valid('json');
    
    // This would typically have authentication/authorization checks
    // to ensure only admin users can create games
    
    const result = await db.insert(games).values({
      name: data.name,
      description: data.description,
      isActive: data.is_active,
      startDate: data.start_date,
      endDate: data.end_date,
      targetType: data.target_type as TargetType,
      targetPlayers: data.target_players
    }).returning();
    
    return c.json({
      success: true,
      message: 'Game created successfully',
      data: result[0]
    });
  } catch (error: any) {
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
gameRoutes.get('/player/:playerId', async (c) => {
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
    
    const gameRepository = new GameRepository(db);
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
  } catch (error: any) {
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
gameRoutes.get('/:id/missions', async (c) => {
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
      .from(missions)
      .where(eq(missions.gameId, gameId))
      .limit(limit)
      .offset((page - 1) * limit);
      
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(missions)
      .where(eq(missions.gameId, gameId));
    
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
  } catch (error: any) {
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
gameRoutes.put('/:id', zValidator('json', createGameSchema.partial()), async (c) => {
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
    
    const gameRepository = new GameRepository(db);
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
      targetType: data.target_type as TargetType,
      targetPlayers: data.target_players
    });
    
    return c.json({
      success: true,
      message: 'Game updated successfully',
      data: updatedGame
    });
  } catch (error: any) {
    console.error('Error updating game:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to update game',
    }, 500);
  }
});