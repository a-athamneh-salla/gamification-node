import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { TaskService } from '../services/task-service';
import { DB } from '../db';

// Create the tasks router
export const taskRoutes = new Hono<{
  Variables: {
    db: DB;
  };
}>();

/**
 * GET /api/tasks
 * Get all tasks for a store with optional filtering and pagination
 */
taskRoutes.get('/', async (c) => {
  try {
    const db = c.get('db');
    const storeId = parseInt(c.req.query('store_id') || '0');
    const status = c.req.query('status') || 'all';
    const missionId = c.req.query('mission_id') ? parseInt(c.req.query('mission_id')) : undefined;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    
    if (!storeId) {
      return c.json({
        success: false,
        message: 'store_id is required'
      }, 400);
    }
    
    const taskService = new TaskService(db);
    const { tasks, total } = await taskService.getTasksByStore(
      storeId, 
      status, 
      missionId, 
      page, 
      limit
    );
    
    return c.json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error retrieving tasks:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to retrieve tasks',
    }, 500);
  }
});

/**
 * GET /api/tasks/:id
 * Get a specific task by ID
 */
taskRoutes.get('/:id', async (c) => {
  try {
    const db = c.get('db');
    const taskId = parseInt(c.req.param('id'));
    const storeId = parseInt(c.req.query('store_id') || '0');
    
    if (!storeId) {
      return c.json({
        success: false,
        message: 'store_id is required'
      }, 400);
    }
    
    if (isNaN(taskId)) {
      return c.json({
        success: false,
        message: 'Invalid task ID'
      }, 400);
    }
    
    const taskService = new TaskService(db);
    const task = await taskService.getTaskWithProgress(storeId, taskId);
    
    if (!task) {
      return c.json({
        success: false,
        message: 'Task not found or not available to this store'
      }, 404);
    }
    
    return c.json({
      success: true,
      data: task
    });
  } catch (error: any) {
    console.error('Error retrieving task:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to retrieve task',
    }, 500);
  }
});

/**
 * PATCH /api/tasks/:id/skip
 * Skip an optional task
 */
taskRoutes.patch('/:id/skip', async (c) => {
  try {
    const db = c.get('db');
    const taskId = parseInt(c.req.param('id'));
    const storeId = parseInt(c.req.query('store_id') || '0');
    
    if (!storeId) {
      return c.json({
        success: false,
        message: 'store_id is required'
      }, 400);
    }
    
    if (isNaN(taskId)) {
      return c.json({
        success: false,
        message: 'Invalid task ID'
      }, 400);
    }
    
    const taskService = new TaskService(db);
    
    // Check if task is optional before skipping
    const task = await taskService.getTaskById(taskId);
    if (!task) {
      return c.json({
        success: false,
        message: 'Task not found'
      }, 404);
    }
    
    if (!task.isOptional) {
      return c.json({
        success: false,
        message: 'Only optional tasks can be skipped'
      }, 400);
    }
    
    // Skip the task
    const result = await taskService.skipTask(storeId, taskId);
    
    if (!result) {
      return c.json({
        success: false,
        message: 'Failed to skip task'
      }, 500);
    }
    
    return c.json({
      success: true,
      message: 'Task skipped successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Error skipping task:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to skip task',
    }, 500);
  }
});

// Define task creation schema for validation
const createTaskSchema = z.object({
  mission_id: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().optional(),
  points: z.number().int().positive(),
  event_id: z.string().min(1),
  is_optional: z.boolean().default(false),
  is_active: z.boolean().default(true),
  unlock_condition: z.string().optional(), // JSON string for unlock condition
  position: z.number().int().nonnegative().optional()
});

/**
 * POST /api/tasks
 * Create a new task (admin only)
 */
taskRoutes.post('/', zValidator('json', createTaskSchema), async (c) => {
  try {
    const db = c.get('db');
    const data = c.req.valid('json');
    
    // This would typically have authentication/authorization checks
    // to ensure only admin users can create tasks
    
    const result = await db.insert(db.tasks).values({
      missionId: data.mission_id,
      name: data.name,
      description: data.description,
      points: data.points,
      eventId: data.event_id,
      isOptional: data.is_optional,
      isActive: data.is_active,
      unlockCondition: data.unlock_condition,
      position: data.position || 0
    }).returning();
    
    return c.json({
      success: true,
      message: 'Task created successfully',
      data: result[0]
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to create task',
    }, 500);
  }
});