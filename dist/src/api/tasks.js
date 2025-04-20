"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const zod_1 = require("zod");
const task_service_1 = require("../services/task-service");
const schema_1 = require("../db/schema");
// Create the tasks router
exports.taskRoutes = new hono_1.Hono();
/**
 * GET /api/tasks
 * Get all tasks for a store with optional filtering and pagination
 */
exports.taskRoutes.get('/', async (c) => {
    try {
        const db = c.get('db');
        const storeId = parseInt(c.req.query('store_id') || '0');
        const status = c.req.query('status') || 'all';
        const missionIdStr = c.req.query('mission_id');
        const missionId = missionIdStr ? parseInt(missionIdStr) : undefined;
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '20');
        if (!storeId) {
            return c.json({
                success: false,
                message: 'store_id is required'
            }, 400);
        }
        const taskService = new task_service_1.TaskService(db);
        const statusParam = status === 'all' ? 'all' : status;
        const { tasks, total } = await taskService.getTasksByStore(storeId, missionId, statusParam, page, limit);
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
    }
    catch (error) {
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
exports.taskRoutes.get('/:id', async (c) => {
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
        const taskService = new task_service_1.TaskService(db);
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
    }
    catch (error) {
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
exports.taskRoutes.patch('/:id/skip', async (c) => {
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
        const taskService = new task_service_1.TaskService(db);
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
    }
    catch (error) {
        console.error('Error skipping task:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to skip task',
        }, 500);
    }
});
// Define task creation schema for validation
const createTaskSchema = zod_1.z.object({
    mission_id: zod_1.z.number().int().positive(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    points: zod_1.z.number().int().positive(),
    event_id: zod_1.z.string().min(1),
    is_optional: zod_1.z.boolean().default(false),
    is_active: zod_1.z.boolean().default(true),
    unlock_condition: zod_1.z.string().optional(), // JSON string for unlock condition
    position: zod_1.z.number().int().nonnegative().optional()
});
/**
 * POST /api/tasks
 * Create a new task (admin only)
 */
exports.taskRoutes.post('/', (0, zod_validator_1.zValidator)('json', createTaskSchema), async (c) => {
    try {
        const db = c.get('db');
        const data = c.req.valid('json');
        // This would typically have authentication/authorization checks
        // to ensure only admin users can create tasks
        // Make sure to parse the event_id as a number
        const eventId = parseInt(data.event_id);
        if (isNaN(eventId)) {
            return c.json({
                success: false,
                message: 'Invalid event ID'
            }, 400);
        }
        const result = await db.insert(schema_1.tasks).values({
            missionId: data.mission_id,
            name: data.name,
            description: data.description,
            points: data.points,
            eventId: eventId,
            isOptional: data.is_optional,
            order: data.position || 0
        }).returning();
        return c.json({
            success: true,
            message: 'Task created successfully',
            data: result[0]
        });
    }
    catch (error) {
        console.error('Error creating task:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to create task',
        }, 500);
    }
});
