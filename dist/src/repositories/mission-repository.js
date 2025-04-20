"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionRepository = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const base_repository_1 = require("./base-repository");
const schema_1 = require("../db/schema");
/**
 * Mission Repository
 * Handles data access for the Mission entity
 */
class MissionRepository extends base_repository_1.BaseRepository {
    constructor(db) {
        super(db, 'missions');
    }
    /**
     * Find mission by ID
     * @param id Mission ID
     * @returns Mission or null if not found
     */
    async findById(id) {
        const result = await this.db
            .select()
            .from(schema_1.missions)
            .where((0, drizzle_orm_1.eq)(schema_1.missions.id, id))
            .limit(1);
        return result.length ? result[0] : null;
    }
    /**
     * Find all missions with pagination
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object containing missions array and total count
     */
    async findAll(page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        const result = await this.db
            .select()
            .from(schema_1.missions)
            .limit(limitParam)
            .offset(offset);
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.missions);
        return {
            items: result,
            total: Number(countResult[0].count)
        };
    }
    /**
     * Find missions by store ID with filtering by status and pagination
     * @param storeId Store ID
     * @param status Mission status filter
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object containing missions array and total count
     */
    async findByStore(storeId, status = 'all', page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        const currentDate = new Date().toISOString();
        // Build the filter conditions for active missions that are available to this store
        const conditions = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.missions.isActive, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.missions.targetType, 'all'), (0, drizzle_orm_1.sql) `json_extract(${schema_1.missions.targetStores}, '$') LIKE '%${storeId}%'`), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.missions.startDate), (0, drizzle_orm_1.lte)(schema_1.missions.startDate, currentDate)), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.missions.endDate), (0, drizzle_orm_1.gte)(schema_1.missions.endDate, currentDate)));
        // Join with storeMissionProgress to get the mission status for the specific store
        const result = await this.db
            .select({
            mission: schema_1.missions,
            progress: schema_1.storeMissionProgress
        })
            .from(schema_1.missions)
            .leftJoin(schema_1.storeMissionProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeMissionProgress.missionId, schema_1.missions.id), (0, drizzle_orm_1.eq)(schema_1.storeMissionProgress.storeId, storeId)))
            .where(conditions)
            .limit(limitParam)
            .offset(offset);
        // Count total missions matching the criteria
        const totalCount = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.missions)
            .where(conditions)
            .then(res => Number(res[0].count));
        // Now fetch the tasks for each mission
        const missionIds = result.map(r => r.mission.id);
        const taskResults = await this.db
            .select()
            .from(schema_1.tasks)
            .where(missionIds.length > 0
            ? (0, drizzle_orm_1.sql) `${schema_1.tasks.missionId} IN (${missionIds.join(',')})`
            : (0, drizzle_orm_1.sql) `1 = 0`);
        // Group tasks by mission ID
        const tasksByMission = taskResults.reduce((acc, task) => {
            if (!acc[task.missionId]) {
                acc[task.missionId] = [];
            }
            acc[task.missionId].push(task);
            return acc;
        }, {});
        // Combine missions with their tasks and progress data
        const missionsWithTasks = result.map(r => {
            const missionWithProgress = {
                ...r.mission,
                tasks: tasksByMission[r.mission.id] || [],
                status: r.progress?.status || 'not_started',
                pointsEarned: r.progress?.pointsEarned || 0,
            };
            // Add progress percentage
            const totalPoints = missionWithProgress.tasks.reduce((sum, task) => sum + task.points, 0);
            const progressPercentage = totalPoints > 0
                ? Math.round((missionWithProgress.pointsEarned / totalPoints) * 100)
                : 0;
            return {
                ...missionWithProgress,
                progress_percentage: progressPercentage
            };
        });
        // Apply status filtering if needed
        const filteredMissions = status === 'all'
            ? missionsWithTasks
            : missionsWithTasks.filter(m => m.status === status);
        return {
            missions: filteredMissions,
            total: status === 'all' ? totalCount : filteredMissions.length
        };
    }
    /**
     * Find mission by ID with tasks and progress for a specific store
     * @param storeId Store ID
     * @param missionId Mission ID
     * @returns MissionWithTasks or null if not found
     */
    async findByIdForStore(storeId, missionId) {
        // Get the mission
        const missionResult = await this.db
            .select()
            .from(schema_1.missions)
            .where((0, drizzle_orm_1.eq)(schema_1.missions.id, missionId))
            .limit(1);
        if (!missionResult.length) {
            return null;
        }
        const mission = missionResult[0];
        // Get the mission progress for this store
        const progressResult = await this.db
            .select()
            .from(schema_1.storeMissionProgress)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeMissionProgress.missionId, missionId), (0, drizzle_orm_1.eq)(schema_1.storeMissionProgress.storeId, storeId)))
            .limit(1);
        // Get tasks for this mission
        const taskResults = await this.db
            .select()
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.missionId, missionId));
        // Combine mission with tasks and progress data
        const missionWithProgress = {
            ...mission,
            tasks: taskResults,
            status: progressResult.length ? progressResult[0].status : 'not_started',
            pointsEarned: progressResult.length ? progressResult[0].pointsEarned : 0,
        };
        // Add progress percentage
        const totalPoints = taskResults.reduce((sum, task) => sum + task.points, 0);
        const progressPercentage = totalPoints > 0
            ? Math.round((missionWithProgress.pointsEarned / totalPoints) * 100)
            : 0;
        return {
            ...missionWithProgress,
            progress_percentage: progressPercentage
        };
    }
    /**
     * Create new mission
     * @param data Mission data
     * @returns Created mission
     */
    async create(data) {
        const result = await this.db
            .insert(schema_1.missions)
            .values({
            name: data.name,
            description: data.description,
            pointsRequired: data.pointsRequired ?? 0,
            isActive: data.isActive ?? true,
            startDate: data.startDate,
            endDate: data.endDate,
            isRecurring: data.isRecurring ?? false,
            recurrencePattern: data.recurrencePattern,
            prerequisiteMissionId: data.prerequisiteMissionId,
            targetType: data.targetType || 'all',
            targetStores: data.targetStores
        })
            .returning();
        return result[0];
    }
    /**
     * Update existing mission
     * @param id Mission ID
     * @param data Mission data to update
     * @returns Updated mission or null if not found
     */
    async update(id, data) {
        const result = await this.db
            .update(schema_1.missions)
            .set({
            name: data.name,
            description: data.description,
            pointsRequired: data.pointsRequired,
            isActive: data.isActive,
            startDate: data.startDate,
            endDate: data.endDate,
            isRecurring: data.isRecurring,
            recurrencePattern: data.recurrencePattern,
            prerequisiteMissionId: data.prerequisiteMissionId,
            targetType: data.targetType,
            targetStores: data.targetStores,
            updatedAt: (0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`
        })
            .where((0, drizzle_orm_1.eq)(schema_1.missions.id, id))
            .returning();
        return result.length ? result[0] : null;
    }
    /**
     * Delete mission
     * @param id Mission ID
     * @returns True if deleted, false otherwise
     */
    async delete(id) {
        const result = await this.db
            .delete(schema_1.missions)
            .where((0, drizzle_orm_1.eq)(schema_1.missions.id, id))
            .returning({ id: schema_1.missions.id });
        return result.length > 0;
    }
}
exports.MissionRepository = MissionRepository;
