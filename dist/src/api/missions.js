"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.missionRoutes = void 0;
const hono_1 = require("hono");
const zod_1 = require("zod");
const zod_validator_1 = require("@hono/zod-validator");
const mission_service_1 = require("../services/mission-service");
const mission_repository_1 = require("../repositories/mission-repository");
exports.missionRoutes = new hono_1.Hono();
const missionListSchema = zod_1.z.object({
    playerId: zod_1.z.number().int().positive(),
    gameId: zod_1.z.number().int().positive(),
    status: zod_1.z.enum(['not_started', 'in_progress', 'completed', 'skipped', 'all']).optional(),
    page: zod_1.z.number().int().min(1).optional().default(1),
    limit: zod_1.z.number().int().min(1).max(100).optional().default(10)
});
// Get missions for a player in a game
exports.missionRoutes.get('/', (0, zod_validator_1.zValidator)('query', missionListSchema), async (c) => {
    try {
        const db = c.get('db');
        const { playerId, gameId, status, page = 1, limit = 10 } = c.req.valid('query');
        const statusParam = status === 'all' ? undefined : status;
        const missionService = new mission_service_1.MissionService(new mission_repository_1.MissionRepository(db));
        const { missions, total } = await missionService.getPlayerMissionsByGame(playerId, gameId, statusParam, page, limit);
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
    }
    catch (error) {
        console.error('Error getting missions:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to get missions'
        }, 500);
    }
});
// Get mission details with tasks and progress
exports.missionRoutes.get('/:missionId', async (c) => {
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
        const missionService = new mission_service_1.MissionService(new mission_repository_1.MissionRepository(db));
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
    }
    catch (error) {
        console.error('Error getting mission details:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to get mission details'
        }, 500);
    }
});
