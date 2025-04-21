import { Hono } from 'hono';
import { LeaderboardRepository } from '../repositories/leaderboard-repository';
import { DB } from '../db';

// Create the leaderboard router
export const leaderboardRoutes = new Hono<{
  Variables: {
    db: DB;
  };
}>();

/**
 * GET /api/leaderboard/:gameId
 * Get leaderboard for a specific game
 */
leaderboardRoutes.get('/:gameId', async (c) => {
  try {
    const db = c.get('db');
    const gameId = parseInt(c.req.param('gameId'));
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    
    if (isNaN(gameId)) {
      return c.json({
        success: false,
        message: 'Invalid game ID'
      }, 400);
    }
    
    const leaderboardRepository = new LeaderboardRepository(db);
    const { entries, total } = await leaderboardRepository.getGameLeaderboard(
      gameId, 
      page, 
      limit
    );
    
    return c.json({
      success: true,
      data: entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error retrieving leaderboard:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to retrieve leaderboard',
    }, 500);
  }
});

/**
 * GET /api/leaderboard/:gameId/stats
 * Get statistics about the leaderboard for a game
 */
leaderboardRoutes.get('/:gameId/stats', async (c) => {
  try {
    const db = c.get('db');
    const gameId = parseInt(c.req.param('gameId'));
    
    if (isNaN(gameId)) {
      return c.json({
        success: false,
        message: 'Invalid game ID'
      }, 400);
    }
    
    const leaderboardRepository = new LeaderboardRepository(db);
    const stats = await leaderboardRepository.getLeaderboardStats(gameId);
    
    return c.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error retrieving leaderboard stats:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to retrieve leaderboard stats',
    }, 500);
  }
});

/**
 * GET /api/leaderboard/:gameId/top/:count
 * Get top players for a game
 */
leaderboardRoutes.get('/:gameId/top/:count', async (c) => {
  try {
    const db = c.get('db');
    const gameId = parseInt(c.req.param('gameId'));
    const count = parseInt(c.req.param('count') || '10');
    
    if (isNaN(gameId)) {
      return c.json({
        success: false,
        message: 'Invalid game ID'
      }, 400);
    }
    
    if (isNaN(count) || count < 1) {
      return c.json({
        success: false,
        message: 'Invalid count parameter'
      }, 400);
    }
    
    const leaderboardRepository = new LeaderboardRepository(db);
    const topPlayers = await leaderboardRepository.getTopPlayers(gameId, count);
    
    return c.json({
      success: true,
      data: topPlayers
    });
  } catch (error: any) {
    console.error('Error retrieving top players:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to retrieve top players',
    }, 500);
  }
});

/**
 * GET /api/leaderboard/:gameId/player/:playerId
 * Get a specific player's rank and nearby players
 */
leaderboardRoutes.get('/:gameId/player/:playerId', async (c) => {
  try {
    const db = c.get('db');
    const gameId = parseInt(c.req.param('gameId'));
    const playerId = parseInt(c.req.param('playerId'));
    const range = parseInt(c.req.query('range') || '3');
    
    if (isNaN(gameId)) {
      return c.json({
        success: false,
        message: 'Invalid game ID'
      }, 400);
    }
    
    if (isNaN(playerId)) {
      return c.json({
        success: false,
        message: 'Invalid player ID'
      }, 400);
    }
    
    const leaderboardRepository = new LeaderboardRepository(db);
    const playerRank = await leaderboardRepository.getPlayerRanking(playerId, gameId);
    
    if (!playerRank) {
      return c.json({
        success: false,
        message: 'Player not found on leaderboard'
      }, 404);
    }
    
    const nearbyPlayers = await leaderboardRepository.getNearbyPlayers(playerId, gameId, range);
    
    return c.json({
      success: true,
      data: {
        player: playerRank,
        nearby: nearbyPlayers
      }
    });
  } catch (error: any) {
    console.error('Error retrieving player ranking:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to retrieve player ranking',
    }, 500);
  }
});

/**
 * POST /api/leaderboard/:gameId/recalculate
 * Recalculate ranks for a game's leaderboard (admin only)
 */
leaderboardRoutes.post('/:gameId/recalculate', async (c) => {
  try {
    const db = c.get('db');
    const gameId = parseInt(c.req.param('gameId'));
    
    if (isNaN(gameId)) {
      return c.json({
        success: false,
        message: 'Invalid game ID'
      }, 400);
    }
    
    // This would typically have authentication/authorization checks
    // to ensure only admin users can trigger recalculation
    
    const leaderboardRepository = new LeaderboardRepository(db);
    const updatedCount = await leaderboardRepository.recalculateRanks(gameId);
    
    return c.json({
      success: true,
      message: 'Leaderboard ranks recalculated successfully',
      data: {
        updatedEntries: updatedCount
      }
    });
  } catch (error: any) {
    console.error('Error recalculating leaderboard ranks:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to recalculate leaderboard ranks',
    }, 500);
  }
});