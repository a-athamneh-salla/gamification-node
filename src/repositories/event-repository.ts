import { eq, sql } from 'drizzle-orm';
import { BaseRepository } from './base-repository';
import { events } from '../db/schema';
import { Event } from '../types';
import { DB } from '../db';

/**
 * Event Repository
 * Handles data access for the Event entity
 */
export class EventRepository extends BaseRepository<Event> {
  constructor(db: DB) {
    super(db, 'events');
  }

  /**
   * Get all events without pagination
   * @returns Array of all events
   */
  async getAllEvents(): Promise<Event[]> {
    const result = await this.db
      .select()
      .from(events);

    return result as Event[];
  }

  /**
   * Find event by ID
   * @param id Event ID
   * @returns Event or null if not found
   */
  async findById(id: number): Promise<Event | null> {
    const result = await this.db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    return result.length ? result[0] as Event : null;
  }

  /**
   * Get event by ID - alias for findById
   * @param id Event ID
   * @returns Event or null if not found
   */
  async getEventById(id: number): Promise<Event | null> {
    return this.findById(id);
  }

  /**
   * Find event by name
   * @param name Event name
   * @returns Event or null if not found
   */
  async findByName(name: string): Promise<Event | null> {
    const result = await this.db
      .select()
      .from(events)
      .where(eq(events.name, name))
      .limit(1);

    return result.length ? result[0] as Event : null;
  }

  /**
   * Get event by name - alias for findByName
   * @param name Event name
   * @returns Event or null if not found
   */
  async getEventByName(name: string): Promise<Event | null> {
    return this.findByName(name);
  }

  /**
   * Find all events with pagination
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object containing events array and total count
   */
  async findAll(page: number = 1, limit: number = 10): Promise<{ items: Event[], total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
    
    const result = await this.db
      .select()
      .from(events)
      .limit(limitParam)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(events);

    return {
      items: result as Event[],
      total: Number(countResult[0].count)
    };
  }

  /**
   * Create new event
   * @param data Event data
   * @returns Created event
   */
  async create(data: Partial<Event>): Promise<Event> {
    const result = await this.db
      .insert(events)
      .values({
        name: data.name as string,
        description: data.description,
      })
      .returning();

    return result[0] as Event;
  }

  /**
   * Update existing event
   * @param id Event ID
   * @param data Event data to update
   * @returns Updated event or null if not found
   */
  async update(id: number, data: Partial<Event>): Promise<Event | null> {
    const result = await this.db
      .update(events)
      .set({
        name: data.name,
        description: data.description,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(events.id, id))
      .returning();

    return result.length ? result[0] as Event : null;
  }

  /**
   * Delete event
   * @param id Event ID
   * @returns True if deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(events)
      .where(eq(events.id, id))
      .returning({ id: events.id });

    return result.length > 0;
  }
}