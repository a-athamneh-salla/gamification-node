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
    formatTask(row, progress) {
        return {
            id: row.id,
            missionId: row.missionId,
            gameId: progress?.gameId,
            eventId: row.eventId,
            name: row.name,
            description: row.description || undefined,
            points: row.points,
            isOptional: row.isOptional,
            isActive: row.isActive,
            requiredProgress: row.requiredProgress,
            order: row.order,
            status: progress?.status || 'not_started',
            progress: progress?.progress || 0,
            completedAt: progress?.completedAt || undefined,
            skippedAt: progress?.skippedAt || undefined,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        };
    }
    /**
     * Find all tasks with pagination
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object containing items array and total count
     */
    async findAll(page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        const items = await this.db
            .select()
            .from(schema_1.tasks)
            .limit(limitParam)
            .offset(offset);
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.tasks);
        return {
            items: items,
            total: Number(count)
        };
    }
    /**
     * Find task by ID
     * @param id Task ID
     * @returns Task or null if not found
     */
    async findById(id) {
        const result = await this.db
            .select({
            id: schema_1.tasks.id,
            missionId: schema_1.tasks.missionId,
            eventId: schema_1.tasks.eventId,
            name: schema_1.tasks.name,
            description: schema_1.tasks.description,
            points: schema_1.tasks.points,
            isOptional: schema_1.tasks.isOptional,
            order: schema_1.tasks.order,
            createdAt: schema_1.tasks.createdAt,
            updatedAt: schema_1.tasks.updatedAt
        })
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
            .limit(1);
        if (!result.length)
            return null;
        return {
            ...result[0],
            description: result[0].description || undefined
        };
    }
    /**
     * Find task by ID with related event
     * @param id Task ID
     * @returns Task with event information or null if not found
     */
    async getTaskWithEvent(id) {
        // This would typically join with the events table to get event details
        const result = await this.db
            .select()
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
            .limit(1);
        return result.length ? result[0] : null;
    }
    /**
     * Find tasks for a player in a specific mission with progress information
     * @param playerId Player ID
     * @param missionId Mission ID
     * @param status Optional filter by status
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object with tasks array and total count
     */
    async findByPlayerAndMission(playerId, missionId, status = 'all', page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        // Get tasks for this mission with progress info
        const result = await this.db
            .select()
            .from(schema_1.tasks)
            .leftJoin(schema_1.playerTaskProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.taskId, schema_1.tasks.id), (0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.playerId, playerId)))
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.missionId, missionId))
            .orderBy(schema_1.tasks.order)
            .limit(limitParam)
            .offset(offset);
        // Filter by status if specified
        let filteredResult = result;
        if (status !== 'all') {
            filteredResult = result.filter(row => {
                // If no progress record exists, task is "not_started"
                const rowStatus = row.player_task_progress?.status || 'not_started';
                return rowStatus === status;
            });
        }
        // Count total tasks
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.missionId, missionId));
        // Add progress info to tasks
        const tasksWithStatus = filteredResult.map(row => ({
            ...row.tasks,
            status: row.player_task_progress?.status || 'not_started',
            completedAt: row.player_task_progress?.completedAt,
            skippedAt: row.player_task_progress?.skippedAt
        }));
        return {
            tasks: tasksWithStatus,
            total: Number(countResult[0].count)
        };
    }
    /**
     * Find task by ID for a specific player with progress information
     * @param playerId Player ID
     * @param taskId Task ID
     * @returns Task with progress information or null if not found
     */
    async findByIdForPlayer(playerId, taskId) {
        const result = await this.db
            .select()
            .from(schema_1.tasks)
            .leftJoin(schema_1.playerTaskProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.taskId, schema_1.tasks.id), (0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.playerId, playerId)))
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, taskId))
            .limit(1);
        if (!result.length) {
            return null;
        }
        const task = result[0].tasks;
        const progress = result[0].player_task_progress;
        return {
            ...task,
            status: progress?.status || 'not_started',
            completedAt: progress?.completedAt,
            skippedAt: progress?.skippedAt
        };
    }
    /**
     * Update task progress for a player
     * @param playerId Player ID
     * @param taskId Task ID
     * @param status New status
     * @returns Updated task with progress information
     */
    async updateProgress(playerId, taskId, status) {
        const now = new Date().toISOString();
        // Check if progress record exists
        const existingProgress = await this.db
            .select()
            .from(schema_1.playerTaskProgress)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.playerId, playerId), (0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.taskId, taskId)))
            .limit(1);
        // Get task to get game ID
        const task = await this.findById(taskId);
        if (!task) {
            throw new Error(`Task with ID ${taskId} not found`);
        }
        // Prepare update data based on status
        const updateData = {
            status,
            updatedAt: now
        };
        if (status === 'completed') {
            updateData.completedAt = now;
        }
        else if (status === 'skipped') {
            updateData.skippedAt = now;
        }
        if (existingProgress.length) {
            // Update existing progress
            await this.db
                .update(schema_1.playerTaskProgress)
                .set(updateData)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.playerId, playerId), (0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.taskId, taskId)));
        }
        else {
            // Create new progress record
            await this.db
                .insert(schema_1.playerTaskProgress)
                .values({
                playerId,
                taskId,
                gameId: task.gameId || task.missionId, // Use game ID from task, fall back to mission ID
                status,
                completedAt: status === 'completed' ? now : null,
                skippedAt: status === 'skipped' ? now : null,
                createdAt: now,
                updatedAt: now
            });
        }
        // Return updated task with progress
        return this.findByIdForPlayer(playerId, taskId);
    }
    /**
     * Create new task
     * @param data Task data
     * @returns Created task
     */
    async create(data) {
        const result = await this.db
            .insert(schema_1.tasks)
            .values({
            name: data.name,
            description: data.description,
            missionId: data.missionId,
            eventId: data.eventId,
            points: data.points || 0,
            isOptional: data.isOptional ?? false,
            isActive: data.isActive ?? true,
            requiredProgress: data.requiredProgress || 1,
            order: data.order || 0
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
            updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`,
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
     * Find tasks by event ID
     * @param eventId Event ID
     * @returns Array of tasks
     */
    async findByEventId(eventId) {
        const result = await this.db
            .select()
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.eventId, eventId));
        return result.map(task => ({
            ...task,
            description: task.description ?? undefined
        }));
    }
    /**
     * Find tasks for a mission
     * @param missionId Mission ID
     * @returns Tasks array
     */
    async findByMission(missionId) {
        try {
            const result = await this.db.select()
                .from(schema_1.tasks)
                .where((0, drizzle_orm_1.eq)(schema_1.tasks.missionId, missionId));
            return result.map(task => ({
                ...task,
                description: task.description ?? undefined
            }));
        }
        catch (error) {
            console.error('Error finding tasks by mission ID:', error);
            throw error;
        }
    }
    /**
     * Find all tasks for a player with progress information
     * @param playerId Player ID
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object with tasks array and total count
     */
    async findByPlayer(playerId, page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        // Get all tasks with progress info for this player
        const result = await this.db
            .select()
            .from(schema_1.tasks)
            .leftJoin(schema_1.playerTaskProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.taskId, schema_1.tasks.id), (0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.playerId, playerId)))
            .orderBy(schema_1.tasks.missionId, schema_1.tasks.order)
            .limit(limitParam)
            .offset(offset);
        // Count total tasks
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.tasks);
        // Add progress info to tasks
        const tasksWithStatus = result.map(row => ({
            ...row.tasks,
            status: row.player_task_progress?.status || 'not_started',
            completedAt: row.player_task_progress?.completedAt,
            skippedAt: row.player_task_progress?.skippedAt
        }));
        return {
            tasks: tasksWithStatus,
            total: Number(countResult[0].count)
        };
    }
    /**
     * Find tasks by mission ID
     * @param missionId Mission ID
     * @returns Array of tasks
     */
    async findByMissionId(missionId) {
        const result = await this.db
            .select({
            id: schema_1.tasks.id,
            missionId: schema_1.tasks.missionId,
            eventId: schema_1.tasks.eventId,
            name: schema_1.tasks.name,
            description: schema_1.tasks.description,
            points: schema_1.tasks.points,
            isOptional: schema_1.tasks.isOptional,
            order: schema_1.tasks.order,
            createdAt: schema_1.tasks.createdAt,
            updatedAt: schema_1.tasks.updatedAt
        })
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.missionId, missionId))
            .orderBy(schema_1.tasks.order);
        return result.map(row => ({
            ...row,
            description: row.description || undefined
        }));
    }
    /**
     * Find task by player ID and task ID
     * @param playerId Player ID
     * @param taskId Task ID
     * @returns Task with progress information or null if not found
     */
    async findByPlayerAndTaskId(playerId, taskId) {
        const result = await this.db
            .select({
            id: schema_1.tasks.id,
            missionId: schema_1.tasks.missionId,
            eventId: schema_1.tasks.eventId,
            name: schema_1.tasks.name,
            description: schema_1.tasks.description,
            points: schema_1.tasks.points,
            isOptional: schema_1.tasks.isOptional,
            order: schema_1.tasks.order,
            status: schema_1.playerTaskProgress.status,
            progress: (0, drizzle_orm_1.sql) `COALESCE(${schema_1.playerTaskProgress.progress}, 0)`,
            completedAt: schema_1.playerTaskProgress.completedAt,
            skippedAt: schema_1.playerTaskProgress.skippedAt,
            createdAt: schema_1.tasks.createdAt,
            updatedAt: schema_1.tasks.updatedAt
        })
            .from(schema_1.tasks)
            .leftJoin(schema_1.playerTaskProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.taskId, schema_1.tasks.id), (0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.playerId, playerId)))
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, taskId))
            .limit(1);
        if (!result.length)
            return null;
        return {
            ...result[0],
            description: result[0].description || undefined,
            status: result[0].status || 'not_started'
        };
    }
    /**
     * Find incomplete tasks by event ID and player ID
     * @param playerId Player ID
     * @param eventId Event ID
     * @returns Array of incomplete tasks
     */
    async findIncompleteTasksByEvent(playerId, eventId) {
        const result = await this.db
            .select()
            .from(schema_1.tasks)
            .leftJoin(schema_1.playerTaskProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.taskId, schema_1.tasks.id), (0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.playerId, playerId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.eventId, eventId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.playerTaskProgress.status), (0, drizzle_orm_1.ne)(schema_1.playerTaskProgress.status, 'completed'))));
        return result.map(row => ({
            ...row.tasks,
            description: row.tasks.description || undefined,
            status: row.player_task_progress?.status || 'not_started'
        }));
    }
    /**
     * Update player task progress
     * @param playerId Player ID
     * @param taskId Task ID
     * @param status Task status
     * @returns Updated task with progress information
     */
    async updatePlayerTaskProgress(playerId, taskId, status) {
        const now = new Date().toISOString();
        const task = await this.findById(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }
        // Get mission to get game ID
        const mission = await this.db
            .select()
            .from(schema_1.missions)
            .where((0, drizzle_orm_1.eq)(schema_1.missions.id, task.missionId))
            .limit(1);
        if (!mission.length) {
            throw new Error(`Mission ${task.missionId} not found`);
        }
        // Update or insert progress
        await this.db
            .insert(schema_1.playerTaskProgress)
            .values({
            playerId,
            taskId,
            gameId: mission[0].gameId,
            status,
            completedAt: status === 'completed' ? now : null,
            skippedAt: status === 'skipped' ? now : null,
            createdAt: now,
            updatedAt: now
        })
            .onConflictDoUpdate({
            target: [schema_1.playerTaskProgress.playerId, schema_1.playerTaskProgress.taskId],
            set: {
                status,
                completedAt: status === 'completed' ? now : null,
                skippedAt: status === 'skipped' ? now : null,
                updatedAt: now
            }
        });
        return this.findByPlayerAndTaskId(playerId, taskId);
    }
    async findByEvent(eventId) {
        const result = await this.db
            .select()
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.eventId, eventId.toString()));
        return result.map(row => this.formatTask(row));
    }
    async findByEventWithProgress(eventId, playerId) {
        const result = await this.db
            .select()
            .from(schema_1.tasks)
            .leftJoin(schema_1.playerTaskProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.taskId, schema_1.tasks.id), (0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.playerId, playerId)))
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.eventId, eventId.toString()));
        return result.map(row => this.formatTask(row.tasks, row.player_task_progress));
    }
    /**
     * Find all tasks by event type
     * @param eventType The event type
     * @returns Array of tasks
     */
    async findByEventType(eventType) {
        const result = await this.db
            .select()
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.eventId, eventType))
            .orderBy(schema_1.tasks.order);
        return result;
    }
    /**
     * Find all completed tasks for a mission by player
     * @param missionId The mission ID
     * @param playerId The player ID
     * @returns Array of completed tasks
     */
    async findAllCompletedTasksByMission(missionId, playerId) {
        const result = await this.db
            .select({
            task: schema_1.tasks,
            progress: schema_1.playerTaskProgress
        })
            .from(schema_1.tasks)
            .innerJoin(schema_1.playerTaskProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.id, schema_1.playerTaskProgress.taskId), (0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.playerId, playerId), (0, drizzle_orm_1.eq)(schema_1.playerTaskProgress.status, 'completed')))
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.missionId, missionId))
            .orderBy(schema_1.tasks.order);
        return result.map(row => ({
            ...row.task,
            status: row.progress.status,
            progress: row.progress.progress,
            completedAt: row.progress.completedAt,
            skippedAt: row.progress.skippedAt
        }));
    }
}
exports.TaskRepository = TaskRepository;
