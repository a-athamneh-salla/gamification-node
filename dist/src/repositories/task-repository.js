"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const base_repository_1 = require("./base-repository");
const schema_1 = require("../db/schema");
/**
 * Task Repository
 * Handles data access for the Task entity
 */
class TaskRepository extends base_repository_1.BaseRepository {
    constructor(db) {
        super(db, 'tasks');
    }
    /**
     * Find task by ID
     * @param id Task ID
     * @returns Task or null if not found
     */
    async findById(id) {
        const result = await this.db
            .select()
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
            .limit(1);
        return result.length ? result[0] : null;
    }
    /**
     * Find task by ID with progress for a specific store
     * @param storeId Store ID
     * @param taskId Task ID
     * @returns TaskWithProgress or null if not found
     */
    async findByIdForStore(storeId, taskId) {
        const result = await this.db
            .select({
            task: schema_1.tasks,
            progress: schema_1.storeTaskProgress
        })
            .from(schema_1.tasks)
            .leftJoin(schema_1.storeTaskProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeTaskProgress.taskId, schema_1.tasks.id), (0, drizzle_orm_1.eq)(schema_1.storeTaskProgress.storeId, storeId)))
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, taskId))
            .limit(1);
        if (!result.length) {
            return null;
        }
        const { task, progress } = result[0];
        return {
            ...task,
            status: progress?.status || 'not_started',
            completedAt: progress?.completedAt,
            skippedAt: progress?.skippedAt
        };
    }
    /**
     * Find all tasks with pagination
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object containing tasks array and total count
     */
    async findAll(page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        const result = await this.db
            .select()
            .from(schema_1.tasks)
            .limit(limitParam)
            .offset(offset);
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.tasks);
        return {
            items: result,
            total: Number(countResult[0].count)
        };
    }
    /**
     * Find tasks by mission ID with progress for a specific store
     * @param storeId Store ID
     * @param missionId Mission ID
     * @returns Array of tasks with progress information
     */
    async findByMissionForStore(storeId, missionId) {
        const result = await this.db
            .select({
            task: schema_1.tasks,
            progress: schema_1.storeTaskProgress
        })
            .from(schema_1.tasks)
            .leftJoin(schema_1.storeTaskProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeTaskProgress.taskId, schema_1.tasks.id), (0, drizzle_orm_1.eq)(schema_1.storeTaskProgress.storeId, storeId)))
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.missionId, missionId))
            .orderBy(schema_1.tasks.order);
        return result.map(({ task, progress }) => ({
            ...task,
            status: progress?.status || 'not_started',
            completedAt: progress?.completedAt,
            skippedAt: progress?.skippedAt
        }));
    }
    /**
     * Find tasks by event ID
     * @param eventId Event ID
     * @returns Array of tasks
     */
    async findByEventId(eventId) {
        const result = await this.db
            .select()
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.eventId, eventId));
        return result;
    }
    /**
     * Create new task
     * @param data Task data
     * @returns Created task
     */
    async create(data) {
        if (!data.missionId || !data.eventId) {
            throw new Error('Mission ID and Event ID are required');
        }
        const result = await this.db
            .insert(schema_1.tasks)
            .values({
            missionId: data.missionId,
            eventId: data.eventId,
            name: data.name,
            description: data.description,
            points: data.points ?? 0,
            isOptional: data.isOptional ?? false,
            order: data.order ?? 0,
        })
            .returning();
        return result[0];
    }
    /**
     * Update existing task
     * @param id Task ID
     * @param data Task data to update
     * @returns Updated task or null if not found
     */
    async update(id, data) {
        const result = await this.db
            .update(schema_1.tasks)
            .set({
            name: data.name,
            description: data.description,
            points: data.points,
            isOptional: data.isOptional,
            order: data.order,
            updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
        })
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
            .returning();
        return result.length ? result[0] : null;
    }
    /**
     * Delete task
     * @param id Task ID
     * @returns True if deleted, false otherwise
     */
    async delete(id) {
        const result = await this.db
            .delete(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
            .returning({ id: schema_1.tasks.id });
        return result.length > 0;
    }
    /**
     * Update task progress for a store
     * @param storeId Store ID
     * @param taskId Task ID
     * @param status Task status
     * @returns Updated progress or null if error
     */
    async updateProgress(storeId, taskId, status) {
        // Check if progress entry exists
        const existing = await this.db
            .select()
            .from(schema_1.storeTaskProgress)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeTaskProgress.taskId, taskId), (0, drizzle_orm_1.eq)(schema_1.storeTaskProgress.storeId, storeId)))
            .limit(1);
        const now = new Date().toISOString();
        const statusFields = {
            completed: { status, completedAt: now },
            skipped: { status, skippedAt: now },
            not_started: { status }
        };
        if (existing.length) {
            // Update existing progress
            const result = await this.db
                .update(schema_1.storeTaskProgress)
                .set({
                ...statusFields[status],
                updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeTaskProgress.taskId, taskId), (0, drizzle_orm_1.eq)(schema_1.storeTaskProgress.storeId, storeId)))
                .returning();
            return result[0];
        }
        else {
            // Create new progress entry
            const result = await this.db
                .insert(schema_1.storeTaskProgress)
                .values({
                storeId,
                taskId,
                ...statusFields[status]
            })
                .returning();
            return result[0];
        }
    }
    /**
     * Get task details with event information
     * @param taskId Task ID
     * @returns Task with event details or null if not found
     */
    async getTaskWithEvent(taskId) {
        const result = await this.db
            .select({
            task: schema_1.tasks,
            event: schema_1.events
        })
            .from(schema_1.tasks)
            .leftJoin(schema_1.events, (0, drizzle_orm_1.eq)(schema_1.tasks.eventId, schema_1.events.id))
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, taskId))
            .limit(1);
        if (!result.length) {
            return null;
        }
        const { task, event } = result[0];
        // Merge the task data with event in a format that matches the Task type
        return {
            ...task,
            event: event
        };
    }
    /**
     * Find tasks for a store with optional filtering and pagination
     * @param storeId Store ID
     * @param missionId Optional mission ID filter
     * @param status Optional task status filter
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object with tasks array and total count
     */
    async findByStore(storeId, missionId, status = 'all', page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        // Start building the query
        let query = this.db
            .select({
            task: schema_1.tasks,
            progress: schema_1.storeTaskProgress
        })
            .from(schema_1.tasks)
            .leftJoin(schema_1.storeTaskProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeTaskProgress.taskId, schema_1.tasks.id), (0, drizzle_orm_1.eq)(schema_1.storeTaskProgress.storeId, storeId)));
        // Add mission filter if provided
        if (missionId) {
            query = query.where((0, drizzle_orm_1.eq)(schema_1.tasks.missionId, missionId));
        }
        // Add status filter if provided and not 'all'
        if (status !== 'all') {
            query = query.where((0, drizzle_orm_1.eq)(schema_1.storeTaskProgress.status, status));
        }
        // Execute the query with pagination
        const result = await query
            .orderBy(schema_1.tasks.missionId, schema_1.tasks.order)
            .limit(limitParam)
            .offset(offset);
        // Count total tasks matching the criteria
        const countQuery = this.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.tasks);
        // Apply the same filters to count query
        if (missionId) {
            countQuery.where((0, drizzle_orm_1.eq)(schema_1.tasks.missionId, missionId));
        }
        const countResult = await countQuery;
        // Format the tasks for response
        const formattedTasks = result.map(({ task, progress }) => ({
            ...task,
            status: progress?.status || 'not_started',
            completedAt: progress?.completedAt,
            skippedAt: progress?.skippedAt
        }));
        return {
            tasks: formattedTasks,
            total: Number(countResult[0].count)
        };
    }
}
exports.TaskRepository = TaskRepository;
