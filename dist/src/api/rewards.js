"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rewardRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const zod_1 = require("zod");
const reward_service_1 = require("../services/reward-service");
const schema_1 = require("../db/schema");
// Create the rewards router
exports.rewardRoutes = new hono_1.Hono();
/**
 * GET /api/rewards
 * Get all rewards for a store with optional filtering and pagination
 */
exports.rewardRoutes.get('/', async (c) => {
    try {
        const db = c.get('db');
        const storeId = parseInt(c.req.query('store_id') || '0');
        const status = c.req.query('status') || 'all';
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '10');
        if (!storeId) {
            return c.json({
                success: false,
                message: 'store_id is required'
            }, 400);
        }
        const rewardService = new reward_service_1.RewardService(db);
        const statusParam = status === 'all' ? 'all' : status;
        const { rewards, total } = await rewardService.getRewardsByStore(storeId, statusParam, page, limit);
        return c.json({
            success: true,
            data: rewards,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Error retrieving rewards:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve rewards',
        }, 500);
    }
});
/**
 * GET /api/rewards/:id
 * Get a specific reward by ID with detailed information
 */
exports.rewardRoutes.get('/:id', async (c) => {
    try {
        const db = c.get('db');
        const rewardId = parseInt(c.req.param('id'));
        const storeId = parseInt(c.req.query('store_id') || '0');
        if (!storeId) {
            return c.json({
                success: false,
                message: 'store_id is required'
            }, 400);
        }
        if (isNaN(rewardId)) {
            return c.json({
                success: false,
                message: 'Invalid reward ID'
            }, 400);
        }
        const rewardService = new reward_service_1.RewardService(db);
        const reward = await rewardService.getRewardById(storeId, rewardId);
        if (!reward) {
            return c.json({
                success: false,
                message: 'Reward not found or not available to this store'
            }, 404);
        }
        return c.json({
            success: true,
            data: reward
        });
    }
    catch (error) {
        console.error('Error retrieving reward:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve reward',
        }, 500);
    }
});
/**
 * POST /api/rewards/:id/claim
 * Claim a reward that has been earned
 */
exports.rewardRoutes.post('/:id/claim', async (c) => {
    try {
        const db = c.get('db');
        const rewardId = parseInt(c.req.param('id'));
        const storeId = parseInt(c.req.query('store_id') || '0');
        if (!storeId) {
            return c.json({
                success: false,
                message: 'store_id is required'
            }, 400);
        }
        if (isNaN(rewardId)) {
            return c.json({
                success: false,
                message: 'Invalid reward ID'
            }, 400);
        }
        const rewardService = new reward_service_1.RewardService(db);
        const result = await rewardService.claimReward(storeId, rewardId);
        if (!result.success) {
            return c.json({
                success: false,
                message: result.message
            }, 400);
        }
        return c.json({
            success: true,
            message: result.message,
            data: result.reward
        });
    }
    catch (error) {
        console.error('Error claiming reward:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to claim reward',
        }, 500);
    }
});
// Define reward creation schema for validation
const createRewardSchema = zod_1.z.object({
    mission_id: zod_1.z.number().int().positive(),
    reward_type_id: zod_1.z.number().int().positive(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    value: zod_1.z.string() // JSON string containing reward details
});
/**
 * POST /api/rewards
 * Create a new reward (admin only)
 */
exports.rewardRoutes.post('/', (0, zod_validator_1.zValidator)('json', createRewardSchema), async (c) => {
    try {
        const db = c.get('db');
        const data = c.req.valid('json');
        // This would typically have authentication/authorization checks
        // to ensure only admin users can create rewards
        const result = await db.insert(schema_1.rewards).values({
            missionId: data.mission_id,
            rewardTypeId: data.reward_type_id,
            name: data.name,
            description: data.description,
            value: data.value
        }).returning();
        return c.json({
            success: true,
            message: 'Reward created successfully',
            data: result[0]
        });
    }
    catch (error) {
        console.error('Error creating reward:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to create reward',
        }, 500);
    }
});
