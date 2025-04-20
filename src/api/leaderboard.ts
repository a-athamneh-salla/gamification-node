import { Hono } from 'hono';
import { LeaderboardService } from '../services/leaderboard-service';
import { DB } from '../db';

// Create the leaderboard router
export const leaderboardRoutes = new Hono<{
  Variables: {
    db: DB;
  };
}>();

/**
 * GET /api/leaderboard
 * Get the global leaderboard with pagination
 */
leaderboardRoutes.get('/', async (c) => {
  try {
    const db = c.get('db');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    
    const leaderboardService = new LeaderboardService(db);
    const { entries, total } = await leaderboardService.getLeaderboard(page, limit);
    
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
 * GET /api/leaderboard/store/:id
 * Get a specific store's position in the leaderboard with context
 */
leaderboardRoutes.get('/store/:id', async (c) => {
  try {
    const db = c.get('db');
    const storeId = parseInt(c.req.param('id'));
    const context = parseInt(c.req.query('context') || '2'); // Number of stores to show before and after
    
    if (isNaN(storeId)) {
      return c.json({
        success: false,
        message: 'Invalid store ID'
      }, 400);
    }
    
    const leaderboardService = new LeaderboardService(db);
    const result = await leaderboardService.getLeaderboardPositionWithContext(storeId, context);
    
    if (!result.storePosition) {
      return c.json({
        success: false,
        message: 'Store not found in leaderboard'
      }, 404);
    }
    
    return c.json({
      success: true,
      data: {
        store: result.storePosition,
        context: {
          above: result.storesAbove,
          below: result.storesBelow
        },
        total_stores: result.totalStores
      }
    });
  } catch (error: any) {
    console.error('Error retrieving store position:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to retrieve store position',
    }, 500);
  }
});

/**
 * GET /api/leaderboard/status
 * Get overall statistics for the leaderboard
 */
leaderboardRoutes.get('/status', async (c) => {
  try {
    const db = c.get('db');
    
    const leaderboardService = new LeaderboardService(db);
    const stats = await leaderboardService.getLeaderboardStatistics();
    
    return c.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error retrieving leaderboard statistics:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to retrieve leaderboard statistics',
    }, 500);
  }
});

/**
 * POST /api/leaderboard/recalculate
 * Force a recalculation of the leaderboard (admin only)
 */
leaderboardRoutes.post('/recalculate', async (c) => {
  try {
    const db = c.get('db');
    
    // This would typically have authentication/authorization checks
    // to ensure only admin users can recalculate the leaderboard
    
    const leaderboardService = new LeaderboardService(db);
    const result = await leaderboardService.recalculateLeaderboard();
    
    return c.json({
      success: true,
      message: 'Leaderboard recalculated successfully',
      data: {
        stores_updated: result.storesUpdated
      }
    });
  } catch (error: any) {
    console.error('Error recalculating leaderboard:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to recalculate leaderboard',
    }, 500);
  }
});