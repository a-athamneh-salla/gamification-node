"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const zod_1 = require("zod");
const event_processor_1 = require("../services/event-processor");
const event_repository_1 = require("../repositories/event-repository");
const schema_1 = require("../db/schema");
// Create the events router
exports.eventRoutes = new hono_1.Hono();
// Define event payload schema for validation
const eventPayloadSchema = zod_1.z.object({
    event: zod_1.z.string().min(1),
    store_id: zod_1.z.number().int().positive(),
    timestamp: zod_1.z.string().optional(),
    properties: zod_1.z.record(zod_1.z.any()).optional(),
    user_properties: zod_1.z.record(zod_1.z.any()).optional()
});
/**
 * POST /api/events
 * Receive and process events from Jitsu
 */
exports.eventRoutes.post('/', (0, zod_validator_1.zValidator)('json', eventPayloadSchema), async (c) => {
    try {
        const db = c.get('db');
        const eventData = c.req.valid('json');
        // Create event processor and process the event
        const eventProcessor = new event_processor_1.EventProcessorService(db);
        const result = await eventProcessor.processEvent(eventData);
        return c.json({
            success: true,
            message: 'Event processed successfully',
            data: {
                event: eventData.event,
                store_id: eventData.store_id,
                task_updates: result.taskUpdates || [],
                mission_updates: result.missionUpdates || [],
                reward_updates: result.rewardUpdates || []
            }
        });
    }
    catch (error) {
        console.error('Error processing event:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to process event',
        }, 500);
    }
});
/**
 * GET /api/events
 * Get all available events that can trigger task completions
 */
exports.eventRoutes.get('/', async (c) => {
    try {
        const db = c.get('db');
        const eventRepository = new event_repository_1.EventRepository(db);
        const events = await eventRepository.getAllEvents();
        return c.json({
            success: true,
            data: events
        });
    }
    catch (error) {
        console.error('Error retrieving events:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve events',
        }, 500);
    }
});
/**
 * GET /api/events/:id
 * Get a specific event by ID
 */
exports.eventRoutes.get('/:id', async (c) => {
    try {
        const db = c.get('db');
        const eventId = parseInt(c.req.param('id'));
        if (isNaN(eventId)) {
            return c.json({
                success: false,
                message: 'Invalid event ID'
            }, 400);
        }
        const eventRepository = new event_repository_1.EventRepository(db);
        const event = await eventRepository.getEventById(eventId);
        if (!event) {
            return c.json({
                success: false,
                message: 'Event not found'
            }, 404);
        }
        return c.json({
            success: true,
            data: event
        });
    }
    catch (error) {
        console.error('Error retrieving event:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve event',
        }, 500);
    }
});
// Define event creation schema for validation
const createEventSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional()
});
/**
 * POST /api/events/register
 * Register a new event type (admin only)
 */
exports.eventRoutes.post('/register', (0, zod_validator_1.zValidator)('json', createEventSchema), async (c) => {
    try {
        const db = c.get('db');
        const data = c.req.valid('json');
        // This would typically have authentication/authorization checks
        // to ensure only admin users can create events
        const eventRepository = new event_repository_1.EventRepository(db);
        // Check if event with same name already exists
        const existingEvent = await eventRepository.getEventByName(data.name);
        if (existingEvent) {
            return c.json({
                success: false,
                message: 'Event with this name already exists'
            }, 409);
        }
        const result = await db.insert(schema_1.events).values({
            name: data.name,
            description: data.description
        }).returning();
        return c.json({
            success: true,
            message: 'Event registered successfully',
            data: result[0]
        });
    }
    catch (error) {
        console.error('Error registering event:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to register event',
        }, 500);
    }
});
// Define iteration confirmation schema for validation
const iterationConfirmationSchema = zod_1.z.object({
    confirm: zod_1.z.boolean()
});
/**
 * POST /api/events/confirm-iteration
 * Confirm or deny continuation of event processing iteration
 */
exports.eventRoutes.post('/confirm-iteration', (0, zod_validator_1.zValidator)('json', iterationConfirmationSchema), async (c) => {
    try {
        const db = c.get('db');
        const { confirm } = c.req.valid('json');
        // Create event processor and set iteration confirmation
        const eventProcessor = new event_processor_1.EventProcessorService(db);
        eventProcessor.setIterationConfirmation(confirm);
        return c.json({
            success: true,
            message: confirm
                ? 'Event processing iteration confirmed'
                : 'Event processing iteration paused',
            data: {
                iteration_confirmed: confirm
            }
        });
    }
    catch (error) {
        console.error('Error setting iteration confirmation:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to set iteration confirmation',
        }, 500);
    }
});
/**
 * GET /api/events/iteration-status
 * Get current iteration confirmation status
 */
exports.eventRoutes.get('/iteration-status', async (c) => {
    try {
        const db = c.get('db');
        // Create event processor and get iteration status
        const eventProcessor = new event_processor_1.EventProcessorService(db);
        const iterationConfirmed = eventProcessor.askForIterationConfirmation();
        return c.json({
            success: true,
            data: {
                iterationConfirmed
            }
        });
    }
    catch (error) {
        console.error('Error retrieving iteration status:', error);
        return c.json({
            success: false,
            message: error.message || 'Failed to retrieve iteration status',
        }, 500);
    }
});
