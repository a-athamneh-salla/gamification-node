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
    formatMissionResult(mission, progress) {
        return {
            id: mission.id,
            gameId: mission.gameId,
            name: mission.name,
            description: mission.description ?? undefined,
            pointsRequired: mission.pointsRequired,
            isActive: mission.isActive,
            startDate: mission.startDate || undefined,
            endDate: mission.endDate || undefined,
            isRecurring: mission.isRecurring,
            recurrencePattern: mission.recurrencePattern || undefined,
            prerequisiteMissionId: mission.prerequisiteMissionId || undefined,
            targetType: mission.targetType,
            targetPlayers: mission.targetPlayers || undefined,
            status: progress?.status || 'not_started',
            pointsEarned: progress?.pointsEarned || 0,
            progress: progress?.progress || 0,
            startedAt: progress?.startedAt || undefined,
            completedAt: progress?.completedAt || undefined,
            skippedAt: progress?.skippedAt || undefined,
            createdAt: mission.createdAt || undefined,
            updatedAt: mission.updatedAt || undefined
        };
    }
    /**
     * Find all missions with pagination
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object containing items array and total count
     */
    async findAll(page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        const items = await this.db
            .select()
            .from(schema_1.missions)
            .limit(limitParam)
            .offset(offset);
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.missions);
        return {
            items: items,
            total: Number(count)
        };
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
     * Find mission by ID with tasks
     * @param id Mission ID
     * @returns Mission with tasks or null if not found
     */
    async findByIdWithTasks(id) {
        const mission = await this.findById(id);
        if (!mission) {
            return null;
        }
        // Get tasks for this mission
        const taskResult = await this.db
            .select()
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.missionId, id))
            .orderBy(schema_1.tasks.order);
        return {
            ...mission,
            tasks: taskResult
        };
    }
    /**
     * Find missions for a player with progress info
     * @param playerId Player ID
     * @param status Optional filter by status
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object with missions array and total count
     */
    async findByPlayer(playerId, status, page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        let query = this.db
            .select()
            .from(schema_1.missions)
            .leftJoin(schema_1.playerMissionProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.missionId, schema_1.missions.id), (0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.playerId, playerId)))
            .orderBy(schema_1.missions.id);
        if (status) {
            query = query.where((0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.status, status));
        }
        const result = await query.limit(limitParam).offset(offset);
        const missionsWithProgress = result.map(row => this.formatMissionResult(row.missions, row.player_mission_progress));
        const countResult = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.missions)
            .leftJoin(schema_1.playerMissionProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.missionId, schema_1.missions.id), (0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.playerId, playerId)));
        return {
            missions: missionsWithProgress,
            total: Number(countResult[0].count)
        };
    }
    /**
     * Find mission by ID for a specific player
     * @param playerId Player ID
     * @param missionId Mission ID
     * @returns Mission with progress info or null if not found
     */
    async findByIdForPlayer(playerId, missionId) {
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
        // Get mission progress
        const progressResult = await this.db
            .select()
            .from(schema_1.playerMissionProgress)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.playerId, playerId), (0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.missionId, missionId)))
            .limit(1);
        // Get tasks for this mission with their progress
        const taskItems = await this.db
            .select()
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.missionId, missionId))
            .orderBy(schema_1.tasks.order);
        const tasksWithProgress = await Promise.all(taskItems.map(async (task) => {
            // Get task progress for this player
            const taskProgressResult = await this.db
                .select()
                .from(schema_1.playerMissionProgress)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.playerId, playerId), (0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.missionId, task.id)))
                .limit(1);
            return {
                ...task,
                status: taskProgressResult.length ? taskProgressResult[0].status : 'not_started',
                completedAt: taskProgressResult.length ? taskProgressResult[0].completedAt : undefined,
                skippedAt: taskProgressResult.length ? taskProgressResult[0].skippedAt : undefined
            };
        }));
        // Combine mission with progress data
        return {
            ...mission,
            tasks: tasksWithProgress,
            status: progressResult.length ? progressResult[0].status : 'not_started',
            pointsEarned: progressResult.length ? progressResult[0].pointsEarned : 0,
            progress: mission.pointsRequired > 0
                ? Math.round((progressResult.length ? progressResult[0].pointsEarned : 0) / mission.pointsRequired * 100)
                : 0,
            startedAt: progressResult.length ? progressResult[0].startedAt : undefined,
            completedAt: progressResult.length ? progressResult[0].completedAt : undefined
        };
    }
    /**
     * Find mission by ID for a specific player in a game with progress information
     * @param playerId Player ID
     * @param missionId Mission ID
     * @returns Mission with progress info or null if not found
     */
    async findByPlayerInGame(playerId, missionId) {
        const result = await this.db
            .select({
            id: schema_1.missions.id,
            gameId: schema_1.missions.gameId,
            name: schema_1.missions.name,
            description: schema_1.missions.description,
            pointsRequired: schema_1.missions.pointsRequired,
            isActive: schema_1.missions.isActive,
            startDate: schema_1.missions.startDate,
            endDate: schema_1.missions.endDate,
            isRecurring: schema_1.missions.isRecurring,
            recurrencePattern: schema_1.missions.recurrencePattern,
            prerequisiteMissionId: schema_1.missions.prerequisiteMissionId,
            targetType: schema_1.missions.targetType,
            targetPlayers: schema_1.missions.targetPlayers,
            status: schema_1.playerMissionProgress.status,
            pointsEarned: schema_1.playerMissionProgress.pointsEarned,
            startedAt: schema_1.playerMissionProgress.startedAt,
            completedAt: schema_1.playerMissionProgress.completedAt,
            skippedAt: (0, drizzle_orm_1.sql) `null`,
            createdAt: schema_1.missions.createdAt,
            updatedAt: schema_1.missions.updatedAt
        })
            .from(schema_1.missions)
            .leftJoin(schema_1.playerMissionProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.missionId, schema_1.missions.id), (0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.playerId, playerId)))
            .where((0, drizzle_orm_1.eq)(schema_1.missions.id, missionId))
            .limit(1);
        if (!result.length)
            return null;
        return {
            ...result[0],
            description: result[0].description || undefined,
            startDate: result[0].startDate || undefined,
            endDate: result[0].endDate || undefined,
            recurrencePattern: result[0].recurrencePattern || undefined,
            prerequisiteMissionId: result[0].prerequisiteMissionId || undefined,
            targetPlayers: result[0].targetPlayers || undefined,
            status: result[0].status || 'not_started',
            startedAt: result[0].startedAt || undefined,
            completedAt: result[0].completedAt || undefined,
            skippedAt: undefined
        };
    }
    /**
     * Get missions by player in a game with progress information
     * @param playerId Player ID
     * @param gameId Game ID
     * @param status Optional filter by status
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object with missions array and total count
     */
    async findByPlayerAndGame(playerId, gameId, status = 'all', page = 1, limit = 10) {
        const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
        const currentDate = new Date().toISOString();
        // Build filter conditions for active missions
        let conditions = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.missions.gameId, gameId), (0, drizzle_orm_1.eq)(schema_1.missions.isActive, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.missions.targetType, 'all'), (0, drizzle_orm_1.sql) `json_extract(${schema_1.missions.targetPlayers}, '$') LIKE '%${playerId}%'`), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.missions.startDate), (0, drizzle_orm_1.lte)(schema_1.missions.startDate, currentDate)), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.missions.endDate), (0, drizzle_orm_1.gte)(schema_1.missions.endDate, currentDate)));
        // Get missions that match our criteria
        const result = await this.db
            .select()
            .from(schema_1.missions)
            .leftJoin(schema_1.playerMissionProgress, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.missionId, schema_1.missions.id), (0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.playerId, playerId), (0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.gameId, gameId)))
            .where(conditions)
            .limit(limitParam)
            .offset(offset);
        // Filter by status if specified
        let filteredResult = result;
        if (status !== 'all') {
            filteredResult = result.filter(row => {
                const rowStatus = row.player_mission_progress?.status || 'not_started';
                return rowStatus === status;
            });
        }
        // Count total missions that match our criteria
        const totalFiltered = filteredResult.length;
        // Map results to include progress information
        const missionsWithProgress = filteredResult.map(row => {
            const mission = row.missions;
            const progress = row.player_mission_progress;
            return {
                ...mission,
                description: mission.description ?? undefined,
                startDate: mission.startDate || undefined,
                endDate: mission.endDate || undefined,
                recurrencePattern: mission.recurrencePattern || undefined,
                prerequisiteMissionId: mission.prerequisiteMissionId || undefined,
                targetPlayers: mission.targetPlayers || undefined,
                status: progress?.status || 'not_started',
                pointsEarned: progress?.pointsEarned || 0,
                progress: mission.pointsRequired > 0
                    ? Math.round((progress?.pointsEarned || 0) / mission.pointsRequired * 100)
                    : 0,
                startedAt: progress?.startedAt || undefined,
                completedAt: progress?.completedAt || undefined,
                skippedAt: progress?.skippedAt || undefined
            };
        });
        return {
            missions: missionsWithProgress,
            total: totalFiltered
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
            gameId: data.gameId,
            name: data.name,
            description: data.description,
            pointsRequired: data.pointsRequired || 0,
            isActive: data.isActive ?? true,
            startDate: data.startDate,
            endDate: data.endDate,
            isRecurring: data.isRecurring ?? false,
            recurrencePattern: data.recurrencePattern,
            prerequisiteMissionId: data.prerequisiteMissionId,
            targetType: data.targetType || 'all',
            targetPlayers: data.targetPlayers
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
            targetPlayers: data.targetPlayers,
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
    /**
     * Update mission progress for a player
     * @param playerId Player ID
     * @param missionId Mission ID
     * @param status New status
     * @param pointsEarned Points earned in this mission
     * @param progress Progress percentage (0-100)
     * @returns Updated mission with progress information
     */
    async updateProgress(playerId, missionId, status, pointsEarned = 0, progress = 0) {
        const now = new Date().toISOString();
        // Check if progress record exists
        const existingProgress = await this.db
            .select()
            .from(schema_1.playerMissionProgress)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.playerId, playerId), (0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.missionId, missionId)))
            .limit(1);
        // Get mission to get game ID
        const mission = await this.findById(missionId);
        if (!mission) {
            throw new Error(`Mission with ID ${missionId} not found`);
        }
        // Prepare update data based on status
        const updateData = {
            status,
            pointsEarned,
            progress,
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
                .update(schema_1.playerMissionProgress)
                .set(updateData)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.playerId, playerId), (0, drizzle_orm_1.eq)(schema_1.playerMissionProgress.missionId, missionId)));
        }
        else {
            // Create new progress record
            await this.db
                .insert(schema_1.playerMissionProgress)
                .values({
                playerId,
                missionId,
                gameId: mission.gameId,
                status,
                pointsEarned,
                progress,
                completedAt: status === 'completed' ? now : null,
                skippedAt: status === 'skipped' ? now : null,
                createdAt: now,
                updatedAt: now
            });
        }
        // Return updated mission with progress
        return this.findByIdForPlayer(playerId, missionId);
    }
}
exports.MissionRepository = MissionRepository;
