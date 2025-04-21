"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const zod_1 = require("zod");
const task_service_1 = require("../services/task-service");
const mission_repository_1 = require("../repositories/mission-repository");
const player_repository_1 = require("../repositories/player-repository");
const task_repository_1 = require("../repositories/task-repository");
exports.taskRoutes = new hono_1.Hono();
// Define task filter schema
const taskFilterSchema = zod_1.z.object({
    playerId: zod_1.z.number().int().positive(),
    missionId: zod_1.z.number().int().positive(),
    page: zod_1.z.number().int().min(1).optional().default(1),
    limit: zod_1.z.number().int().min(1).max(100).optional().default(10),
    status: zod_1.z.enum(['not_started', 'completed', 'skipped', 'all']).optional().default('all')
});
// Get tasks for a mission
exports.taskRoutes.get('/', (0, zod_validator_1.zValidator)('query', taskFilterSchema), async (c) => {
    try {
        const db = c.get('db');
        const { playerId, missionId, page = 1, limit = 10, status = 'all' } = c.req.valid('query');
        const taskService = new task_service_1.TaskService(new task_repository_1.TaskRepository(db), new mission_repository_1.MissionRepository(db), new player_repository_1.PlayerRepository(db));
        const result = await taskService.findByPlayerAndMission(playerId, missionId, status === 'all' ? undefined : status, page, limit);
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
    }
    catch (error) {
        console.error('Error getting tasks:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to get tasks'
        }, 500);
    }
});
// Get task details
exports.taskRoutes.get('/:taskId', async (c) => {
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
        const taskService = new task_service_1.TaskService(new task_repository_1.TaskRepository(db), new mission_repository_1.MissionRepository(db), new player_repository_1.PlayerRepository(db));
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
    }
    catch (error) {
        console.error('Error getting task details:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to get task details'
        }, 500);
    }
});
