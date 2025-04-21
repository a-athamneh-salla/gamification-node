import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { TaskService } from '../services/task-service';
import { DB } from '../db';
import { MissionRepository } from '../repositories/mission-repository';
import { PlayerRepository } from '../repositories/player-repository';
import { TaskRepository } from '../repositories/task-repository';

export const taskRoutes = new Hono<{
  Variables: {
    db: DB;
  };
}>();

// Define task filter schema
const taskFilterSchema = z.object({
  playerId: z.number().int().positive(),
  missionId: z.number().int().positive(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(10),
  status: z.enum(['not_started', 'completed', 'skipped', 'all']).optional().default('all')
});

// Get tasks for a mission
taskRoutes.get('/', zValidator('query', taskFilterSchema), async (c) => {
  try {
    const db = c.get('db');
    const { playerId, missionId, page = 1, limit = 10, status = 'all' } = c.req.valid('query');

    const taskService = new TaskService(
      new TaskRepository(db),
      new MissionRepository(db),
      new PlayerRepository(db)
    );

    const result = await taskService.findByPlayerAndMission(
      playerId,
      missionId,
      status === 'all' ? undefined : status,
      page,
      limit
    );

    return c.json({
      success: true,
      data: result?.tasks || [],
      pagination: {
        current: page,
        perPage: limit,
        total: result?.total || 0,
        pages: Math.ceil((result?.total || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('Error getting tasks:', error);
    return c.json({
      success: false,
      message: error.message || 'Failed to get tasks'
    }, 500);
  }
});

// Get task details
taskRoutes.get('/:taskId', async (c) => {
  try {
    const db = c.get('db');
    const taskId = Number(c.req.param('taskId'));
    const playerId = Number(c.req.query('playerId'));

    if (isNaN(taskId) || isNaN(playerId)) {
      return c.json({
        success: false,
        message: 'Invalid task ID or player ID'
      }, 400);
    }

    const taskService = new TaskService(
      new TaskRepository(db),
      new MissionRepository(db),
      new PlayerRepository(db)
    );

    const task = await taskService.getTaskDetails(playerId, taskId);
    if (!task) {
      return c.json({
        success: false,
        message: 'Task not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: task
    });
  } catch (error: any) {
    console.error('Error getting task details:', error);
    return c.json({
      success: false,
      message: error.message || 'Failed to get task details'
    }, 500);
  }
});