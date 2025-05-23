"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventProcessorService = void 0;
const event_repository_1 = require("../repositories/event-repository");
const task_repository_1 = require("../repositories/task-repository");
const mission_repository_1 = require("../repositories/mission-repository");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Event Processor Service
 * Handles processing incoming events, updating task completion and mission progress
 */
class EventProcessorService {
    constructor(db) {
        this.iterationConfirmed = true; // Default to true to ensure backward compatibility
        this.db = db;
        this.eventRepository = new event_repository_1.EventRepository(db);
        this.taskRepository = new task_repository_1.TaskRepository(db);
        this.missionRepository = new mission_repository_1.MissionRepository(db);
    }
    /**
     * Sets the iteration confirmation flag
     * @param confirmed Whether iteration should continue
     */
    setIterationConfirmation(confirmed) {
        this.iterationConfirmed = confirmed;
    }
    /**
     * Asks for confirmation to continue iteration
     * @returns Current state of iteration confirmation
     */
    askForIterationConfirmation() {
        return this.iterationConfirmed;
    }
    /**
     * Resets the iteration confirmation flag to default (true)
     */
    resetIterationConfirmation() {
        this.iterationConfirmed = true;
    }
    /**
     * Process an incoming event
     * @param payload Event payload
     * @returns Object with arrays of completed task IDs and mission IDs
     */
    async processEvent(payload) {
        // If iteration confirmation is required and hasn't been confirmed, return early
        if (!this.iterationConfirmed) {
            return {
                tasks_completed: [],
                missions_completed: [],
                taskUpdates: [],
                missionUpdates: [],
                rewardUpdates: []
            };
        }
        try {
            // Log the event
            const eventLog = await this.logEvent(payload);
            // Find the event in our database
            const event = await this.eventRepository.findByName(payload.event);
            if (!event) {
                throw new Error(`Event "${payload.event}" is not registered in the system`);
            }
            // Find tasks associated with this event
            const tasks = await this.taskRepository.findByEventId(event.id);
            if (!tasks.length) {
                return {
                    tasks_completed: [],
                    missions_completed: [],
                    taskUpdates: [],
                    missionUpdates: [],
                    rewardUpdates: []
                };
            }
            const completedTaskIds = [];
            const completedMissionIds = new Set();
            // Process tasks and update their completion status
            for (const task of tasks) {
                // Check if task is already completed for this store
                const taskWithProgress = await this.taskRepository.findByIdForStore(payload.store_id, task.id);
                if (taskWithProgress?.status !== 'completed') {
                    // Update task progress to completed
                    await this.taskRepository.updateProgress(payload.store_id, task.id, 'completed');
                    completedTaskIds.push(task.id.toString());
                    // Update mission progress
                    const mission = await this.missionRepository.findByIdForStore(payload.store_id, task.missionId);
                    if (mission) {
                        // Check if all required tasks are completed
                        const tasks = mission.tasks || [];
                        const completedTasks = tasks.filter((t) => t.status === 'completed' || t.isOptional);
                        // Calculate points earned
                        const pointsEarned = tasks.reduce((sum, t) => {
                            if (t.status === 'completed') {
                                return sum + t.points;
                            }
                            return sum;
                        }, 0);
                        // Update mission progress
                        await this.updateMissionProgress(payload.store_id, mission.id, pointsEarned, completedTasks.length === tasks.length ? 'completed' : 'in_progress');
                        // Check if mission was completed by this event
                        if (completedTasks.length === tasks.length) {
                            completedMissionIds.add(mission.id.toString());
                        }
                    }
                }
            }
            // Mark the event as processed
            await this.db
                .update(schema_1.eventLogs)
                .set({ processed: true })
                .where((0, drizzle_orm_1.eq)(schema_1.eventLogs.id, eventLog.id));
            return {
                tasks_completed: completedTaskIds,
                missions_completed: Array.from(completedMissionIds),
                taskUpdates: [],
                missionUpdates: [],
                rewardUpdates: []
            };
        }
        catch (error) {
            console.error('Error processing event:', error);
            throw error;
        }
    }
    /**
     * Log an event to the database
     * @param payload Event payload
     * @returns The created event log entry
     */
    async logEvent(payload) {
        const event = await this.eventRepository.findByName(payload.event);
        const result = await this.db
            .insert(schema_1.eventLogs)
            .values({
            storeId: payload.store_id,
            eventId: event?.id || 0,
            payload: JSON.stringify(payload),
            processed: false
        })
            .returning();
        return result[0];
    }
    /**
     * Update mission progress for a store
     * @param storeId Store ID
     * @param missionId Mission ID
     * @param pointsEarned Points earned
     * @param status Mission status
     * @returns The updated mission progress
     */
    async updateMissionProgress(storeId, missionId, pointsEarned, status) {
        // Check if progress entry exists
        const existingProgress = await this.db.query.storeMissionProgress.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeMissionProgress.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.storeMissionProgress.missionId, missionId))
        });
        const now = new Date().toISOString();
        if (existingProgress) {
            // Update existing progress
            const result = await this.db
                .update(schema_1.storeMissionProgress)
                .set({
                pointsEarned,
                status,
                completedAt: status === 'completed' ? now : existingProgress.completedAt,
                updatedAt: now
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeMissionProgress.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.storeMissionProgress.missionId, missionId)))
                .returning();
            return result[0];
        }
        else {
            // Create new progress entry
            const result = await this.db
                .insert(schema_1.storeMissionProgress)
                .values({
                storeId,
                missionId,
                status,
                pointsEarned,
                startedAt: now,
                completedAt: status === 'completed' ? now : undefined
            })
                .returning();
            return result[0];
        }
    }
    /**
     * Check if the current iteration should continue
     * @param shouldContinue Boolean indicating whether to continue iteration
     * @returns True if the iteration is confirmed to continue, false otherwise
     */
    confirmIteration(shouldContinue) {
        this.iterationConfirmed = shouldContinue;
        return this.iterationConfirmed;
    }
    /**
     * Get the current iteration confirmation status
     * @returns True if the system is set to continue iterations, false otherwise
     */
    isIterationConfirmed() {
        return this.iterationConfirmed;
    }
}
exports.EventProcessorService = EventProcessorService;
