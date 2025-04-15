import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { EventProcessor } from '../services/event-processor';
import { EventRepository } from '../repositories/event-repository';
import { DB } from '../db';
import { EventPayload } from '../types';

// Create the events router
export const eventRoutes = new Hono<{
  Variables: {
    db: DB;
  };
}>();

// Define event payload schema for validation
const eventPayloadSchema = z.object({
  event: z.string().min(1),
  store_id: z.number().int().positive(),
  timestamp: z.string().optional(),
  properties: z.record(z.any()).optional(),
  user_properties: z.record(z.any()).optional()
});

/**
 * POST /api/events
 * Receive and process events from Jitsu
 */
eventRoutes.post('/', zValidator('json', eventPayloadSchema), async (c) => {
  try {
    const db = c.get('db');
    const eventData = c.req.valid('json') as EventPayload;
    
    // Create event processor and process the event
    const eventProcessor = new EventProcessor(db);
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
  } catch (error: any) {
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
eventRoutes.get('/', async (c) => {
  try {
    const db = c.get('db');
    const eventRepository = new EventRepository(db);
    const events = await eventRepository.getAllEvents();
    
    return c.json({
      success: true,
      data: events
    });
  } catch (error: any) {
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
eventRoutes.get('/:id', async (c) => {
  try {
    const db = c.get('db');
    const eventId = parseInt(c.req.param('id'));
    
    if (isNaN(eventId)) {
      return c.json({
        success: false,
        message: 'Invalid event ID'
      }, 400);
    }
    
    const eventRepository = new EventRepository(db);
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
  } catch (error: any) {
    console.error('Error retrieving event:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to retrieve event',
    }, 500);
  }
});

// Define event creation schema for validation
const createEventSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

/**
 * POST /api/events/register
 * Register a new event type (admin only)
 */
eventRoutes.post('/register', zValidator('json', createEventSchema), async (c) => {
  try {
    const db = c.get('db');
    const data = c.req.valid('json');
    
    // This would typically have authentication/authorization checks
    // to ensure only admin users can create events
    
    const eventRepository = new EventRepository(db);
    
    // Check if event with same name already exists
    const existingEvent = await eventRepository.getEventByName(data.name);
    
    if (existingEvent) {
      return c.json({
        success: false,
        message: 'Event with this name already exists'
      }, 409);
    }
    
    const result = await db.insert(db.events).values({
      name: data.name,
      description: data.description
    }).returning();
    
    return c.json({
      success: true,
      message: 'Event registered successfully',
      data: result[0]
    });
  } catch (error: any) {
    console.error('Error registering event:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to register event',
    }, 500);
  }
});

// Define iteration confirmation schema for validation
const iterationConfirmationSchema = z.object({
  confirm: z.boolean()
});

/**
 * POST /api/events/confirm-iteration
 * Confirm or deny continuation of event processing iteration
 */
eventRoutes.post('/confirm-iteration', zValidator('json', iterationConfirmationSchema), async (c) => {
  try {
    const db = c.get('db');
    const { confirm } = c.req.valid('json');
    
    // Create event processor and set iteration confirmation
    const eventProcessor = new EventProcessor(db);
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
  } catch (error: any) {
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
eventRoutes.get('/iteration-status', async (c) => {
  try {
    const db = c.get('db');
    
    // Create event processor and get iteration status
    const eventProcessor = new EventProcessor(db);
    const iterationConfirmed = eventProcessor.askForIterationConfirmation();
    
    return c.json({
      success: true,
      data: {
        iterationConfirmed
      }
    });
  } catch (error: any) {
    console.error('Error retrieving iteration status:', error);
    
    return c.json({
      success: false,
      message: error.message || 'Failed to retrieve iteration status',
    }, 500);
  }
});