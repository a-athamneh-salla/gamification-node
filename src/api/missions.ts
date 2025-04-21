import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { DB } from '../db';
import { MissionService } from '../services/mission-service';
import { MissionRepository } from '../repositories/mission-repository';

export const missionRoutes = new Hono<{
  Variables: {
    db: DB;
  };
}>();

const missionListSchema = z.object({
  playerId: z.number().int().positive(),
  gameId: z.number().int().positive(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped', 'all']).optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(10)
});

// Get missions for a player in a game
missionRoutes.get('/', zValidator('query', missionListSchema), async (c) => {
  try {
    const db = c.get('db');
    const { playerId, gameId, status, page = 1, limit = 10 } = c.req.valid('query');
    const statusParam = status === 'all' ? undefined : status;

    const missionService = new MissionService(new MissionRepository(db));
    const { missions, total } = await missionService.getPlayerMissionsByGame(
      playerId,
      gameId,
      statusParam,
      page,
      limit
    );

    return c.json({
      success: true,
      data: missions,
      pagination: {
        current: page,
        perPage: limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error getting missions:', error);
    return c.json({
      success: false,
      message: error.message || 'Failed to get missions'
    }, 500);
  }
});

// Get mission details with tasks and progress
missionRoutes.get('/:missionId', async (c) => {
  try {
    const db = c.get('db');
    const missionId = Number(c.req.param('missionId'));
    const playerId = Number(c.req.query('playerId'));

    if (isNaN(missionId) || isNaN(playerId)) {
      return c.json({
        success: false,
        message: 'Invalid mission ID or player ID'
      }, 400);
    }

    const missionService = new MissionService(new MissionRepository(db));
    const mission = await missionService.getMissionById(playerId, missionId);

    if (!mission) {
      return c.json({
        success: false,
        message: 'Mission not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: mission
    });
  } catch (error: any) {
    console.error('Error getting mission details:', error);
    return c.json({
      success: false,
      message: error.message || 'Failed to get mission details'
    }, 500);
  }
});