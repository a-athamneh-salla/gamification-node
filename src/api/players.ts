import { Hono } from 'hono';
import { PlayerRepository } from '../repositories/player-repository';
import { GameRepository } from '../repositories/game-repository';
import { LeaderboardRepository } from '../repositories/leaderboard-repository';
import { MissionRepository } from '../repositories/mission-repository';
import { DB } from '../db';
import { Player } from '../types';

// Create the players router
export const playerRoutes = new Hono<{
  Variables: {
    db: DB;
  };
}>();

/**
 * GET /api/players
 * List all players with pagination
 */
playerRoutes.get('/', async (c) => {
  try {
    const db = c.get('db');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const search = c.req.query('q');
    
    const playerRepo = new PlayerRepository(db);
    
    let result: { items: Player[]; total: number };
    
    if (search) {
      result = await playerRepo.search(search, page, limit);
    } else {
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
  } catch (error: any) {
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
playerRoutes.get('/:id', async (c) => {
  try {
    const db = c.get('db');
    const id = parseInt(c.req.param('id'));
    
    if (isNaN(id)) {
      return c.json({
        success: false,
        message: 'Invalid player ID'
      }, 400);
    }
    
    const playerRepo = new PlayerRepository(db);
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
  } catch (error: any) {
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
playerRoutes.post('/', async (c) => {
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
    
    const playerRepo = new PlayerRepository(db);
    
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
  } catch (error: any) {
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
playerRoutes.put('/:id', async (c) => {
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
    
    const playerRepo = new PlayerRepository(db);
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
  } catch (error: any) {
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
playerRoutes.delete('/:id', async (c) => {
  try {
    const db = c.get('db');
    const id = parseInt(c.req.param('id'));
    
    if (isNaN(id)) {
      return c.json({
        success: false,
        message: 'Invalid player ID'
      }, 400);
    }
    
    const playerRepo = new PlayerRepository(db);
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
  } catch (error: any) {
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
playerRoutes.get('/:id/games', async (c) => {
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
    
    const playerRepo = new PlayerRepository(db);
    const existingPlayer = await playerRepo.findById(id);
    
    if (!existingPlayer) {
      return c.json({
        success: false,
        message: 'Player not found'
      }, 404);
    }
    
    const gameRepo = new GameRepository(db);
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
  } catch (error: any) {
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
playerRoutes.get('/:id/missions', async (c) => {
  try {
    const db = c.get('db');
    const id = parseInt(c.req.param('id'));
    const gameIdString = c.req.query('gameId');
    const gameId = gameIdString ? parseInt(gameIdString) : undefined;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const status = c.req.query('status') as any; // 'completed', 'in_progress', or null for all
    
    if (isNaN(id)) {
      return c.json({
        success: false,
        message: 'Invalid player ID'
      }, 400);
    }
    
    if (gameIdString && isNaN(gameId as number)) {
      return c.json({
        success: false,
        message: 'Invalid game ID'
      }, 400);
    }
    
    const playerRepo = new PlayerRepository(db);
    const existingPlayer = await playerRepo.findById(id);
    
    if (!existingPlayer) {
      return c.json({
        success: false,
        message: 'Player not found'
      }, 404);
    }
    
    const missionRepo = new MissionRepository(db);
    let result;
    
    if (gameId) {
      result = await missionRepo.findByPlayerAndGame(id, gameId, status, page, limit);
    } else {
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
  } catch (error: any) {
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
playerRoutes.get('/:id/leaderboard/:gameId', async (c) => {
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
    
    const playerRepo = new PlayerRepository(db);
    const existingPlayer = await playerRepo.findById(playerId);
    
    if (!existingPlayer) {
      return c.json({
        success: false,
        message: 'Player not found'
      }, 404);
    }
    
    const leaderboardRepo = new LeaderboardRepository(db);
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
  } catch (error: any) {
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
playerRoutes.get('/external/:externalId', async (c) => {
  try {
    const db = c.get('db');
    const externalId = c.req.param('externalId');
    
    const playerRepo = new PlayerRepository(db);
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
  } catch (error: any) {
    console.error('Error retrieving player by external ID:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to retrieve player',
    }, 500);
  }
});