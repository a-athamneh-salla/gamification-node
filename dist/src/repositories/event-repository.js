"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const base_repository_1 = require("./base-repository");
const schema_1 = require("../db/schema");
/**
 * Event Repository
 * Handles data access for the Event entity
 */
class EventRepository extends base_repository_1.BaseRepository {
    constructor(db) {
        super(db, 'events');
    }
    /**
     * Get all events without pagination
     * @returns Array of all events
     */
    async getAllEvents() {
        const result = await this.db
            .select()
            .from(schema_1.events);
        return result;
    }
    /**
     * Find event by ID
     * @param id Event ID
     * @returns Event or null if not found
     */
    async findById(id) {
        const result = await this.db
            .select()
            .from(schema_1.events)
            .where((0, drizzle_orm_1.eq)(schema_1.events.id, id))
            .limit(1);
        return result.length ? result[0] : null;
    }
    /**
     * Get event by ID - alias for findById
     * @param id Event ID
     * @returns Event or null if not found
     */
    async getEventById(id) {
        return this.findById(id);
    }
    /**
     * Find event by name
     * @param name Event name
     * @returns Event or null if not found
     */
    async findByName(name) {
        const result = await this.db
            .select()
            .from(schema_1.events)
            .where((0, drizzle_orm_1.eq)(schema_1.events.name, name))
            .limit(1);
        return result.length ? result[0] : null;
    }
    /**
     * Get event by name - alias for findByName
     * @param name Event name
     * @returns Event or null if not found
     */
    async getEventByName(name) {
        return this.findByName(name);
    }
    /**
     * Find all events with pagination
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object containing events array and total count
     */
    async findAll(page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        const result = await this.db
            .select()
            .from(schema_1.events)
            .limit(limitParam)
            .offset(offset);
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.events);
        return {
            items: result,
            total: Number(countResult[0].count)
        };
    }
    /**
     * Create new event
     * @param data Event data
     * @returns Created event
     */
    async create(data) {
        const result = await this.db
            .insert(schema_1.events)
            .values({
            name: data.name,
            description: data.description,
        })
            .returning();
        return result[0];
    }
    /**
     * Update existing event
     * @param id Event ID
     * @param data Event data to update
     * @returns Updated event or null if not found
     */
    async update(id, data) {
        const result = await this.db
            .update(schema_1.events)
            .set({
            name: data.name,
            description: data.description,
            updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
        })
            .where((0, drizzle_orm_1.eq)(schema_1.events.id, id))
            .returning();
        return result.length ? result[0] : null;
    }
    /**
     * Delete event
     * @param id Event ID
     * @returns True if deleted, false otherwise
     */
    async delete(id) {
        const result = await this.db
            .delete(schema_1.events)
            .where((0, drizzle_orm_1.eq)(schema_1.events.id, id))
            .returning({ id: schema_1.events.id });
        return result.length > 0;
    }
}
exports.EventRepository = EventRepository;
