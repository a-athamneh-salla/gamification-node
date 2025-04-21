import { eq, sql, and, or, lte, gte, isNull } from 'drizzle-orm';
import { BaseRepository } from './base-repository';
import { missions, tasks, playerMissionProgress } from '../db/schema';
import { Mission, MissionStatus, TargetType } from '../types';
import { DB } from '../db';

/**
 * Mission Repository
 * Handles data access for the Mission entity
 */
export class MissionRepository extends BaseRepository<Mission> {
  constructor(db: DB) {
    super(db, 'missions');
  }

  private formatMissionResult(mission: any, progress?: any): Mission {
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
  async findAll(page: number = 1, limit: number = 10): Promise<{ items: Mission[], total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
    
    const items = await this.db
      .select()
      .from(missions)
      .limit(limitParam)
      .offset(offset);
    
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(missions);
    
    return {
      items: items as Mission[],
      total: Number(count)
    };
  }

  /**
   * Find mission by ID
   * @param id Mission ID
   * @returns Mission or null if not found
   */
  async findById(id: number): Promise<Mission | null> {
    const result = await this.db
      .select()
      .from(missions)
      .where(eq(missions.id, id))
      .limit(1);

    return result.length ? result[0] as Mission : null;
  }

  /**
   * Find mission by ID with tasks
   * @param id Mission ID
   * @returns Mission with tasks or null if not found
   */
  async findByIdWithTasks(id: number): Promise<Mission | null> {
    const mission = await this.findById(id);
    if (!mission) {
      return null;
    }

    // Get tasks for this mission
    const taskResult = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.missionId, id))
      .orderBy(tasks.order);

    return {
      ...mission,
      tasks: taskResult as any[]
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
  async findByPlayer(
    playerId: number,
    status?: MissionStatus,
    page: number = 1,
    limit: number = 10
  ): Promise<{ missions: Mission[]; total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);

    let query = this.db
      .select()
      .from(missions)
      .leftJoin(
        playerMissionProgress,
        and(
          eq(playerMissionProgress.missionId, missions.id),
          eq(playerMissionProgress.playerId, playerId)
        )
      )
      .orderBy(missions.id);

    if (status) {
      query = query.where(eq(playerMissionProgress.status, status));
    }

    const result = await query.limit(limitParam).offset(offset);
    const missionsWithProgress: Mission[] = result.map(row => 
      this.formatMissionResult(row.missions, row.player_mission_progress)
    );

    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(missions)
      .leftJoin(
        playerMissionProgress,
        and(
          eq(playerMissionProgress.missionId, missions.id),
          eq(playerMissionProgress.playerId, playerId)
        )
      );

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
  async findByIdForPlayer(playerId: number, missionId: number): Promise<any> {
    // Get the mission
    const missionResult = await this.db
      .select()
      .from(missions)
      .where(eq(missions.id, missionId))
      .limit(1);

    if (!missionResult.length) {
      return null;
    }

    const mission = missionResult[0];

    // Get mission progress
    const progressResult = await this.db
      .select()
      .from(playerMissionProgress)
      .where(
        and(
          eq(playerMissionProgress.playerId, playerId),
          eq(playerMissionProgress.missionId, missionId)
        )
      )
      .limit(1);

    // Get tasks for this mission with their progress
    const taskItems = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.missionId, missionId))
      .orderBy(tasks.order);

    const tasksWithProgress = await Promise.all(taskItems.map(async (task) => {
      // Get task progress for this player
      const taskProgressResult = await this.db
        .select()
        .from(playerMissionProgress)
        .where(
          and(
            eq(playerMissionProgress.playerId, playerId),
            eq(playerMissionProgress.missionId, task.id)
          )
        )
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
  async findByPlayerInGame(playerId: number, missionId: number): Promise<Mission | null> {
    const result = await this.db
      .select({
        id: missions.id,
        gameId: missions.gameId,
        name: missions.name,
        description: missions.description,
        pointsRequired: missions.pointsRequired,
        isActive: missions.isActive,
        startDate: missions.startDate,
        endDate: missions.endDate,
        isRecurring: missions.isRecurring,
        recurrencePattern: missions.recurrencePattern,
        prerequisiteMissionId: missions.prerequisiteMissionId,
        targetType: missions.targetType,
        targetPlayers: missions.targetPlayers,
        status: playerMissionProgress.status,
        pointsEarned: playerMissionProgress.pointsEarned,
        startedAt: playerMissionProgress.startedAt,
        completedAt: playerMissionProgress.completedAt,
        skippedAt: sql<string>`null`,
        createdAt: missions.createdAt,
        updatedAt: missions.updatedAt
      })
      .from(missions)
      .leftJoin(
        playerMissionProgress,
        and(
          eq(playerMissionProgress.missionId, missions.id),
          eq(playerMissionProgress.playerId, playerId)
        )
      )
      .where(eq(missions.id, missionId))
      .limit(1);

    if (!result.length) return null;

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
    } as Mission;
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
  async findByPlayerAndGame(
    playerId: number,
    gameId: number, 
    status: MissionStatus | 'all' = 'all',
    page: number = 1, 
    limit: number = 10
  ): Promise<{ missions: Mission[], total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
    const currentDate = new Date().toISOString();
    
    // Build filter conditions for active missions
    let conditions = and(
      eq(missions.gameId, gameId),
      eq(missions.isActive, true),
      or(
        eq(missions.targetType, 'all'),
        sql`json_extract(${missions.targetPlayers}, '$') LIKE '%${playerId}%'`
      ),
      or(
        isNull(missions.startDate),
        lte(missions.startDate, currentDate)
      ),
      or(
        isNull(missions.endDate),
        gte(missions.endDate, currentDate)
      )
    );

    // Get missions that match our criteria
    const result = await this.db
      .select()
      .from(missions)
      .leftJoin(
        playerMissionProgress,
        and(
          eq(playerMissionProgress.missionId, missions.id),
          eq(playerMissionProgress.playerId, playerId),
          eq(playerMissionProgress.gameId, gameId)
        )
      )
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
    const missionsWithProgress: Mission[] = filteredResult.map(row => {
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
      } as Mission;
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
  async create(data: Partial<Mission>): Promise<Mission> {
    const result = await this.db
      .insert(missions)
      .values({
        gameId: data.gameId as number,
        name: data.name as string,
        description: data.description,
        pointsRequired: data.pointsRequired || 0,
        isActive: data.isActive ?? true,
        startDate: data.startDate,
        endDate: data.endDate,
        isRecurring: data.isRecurring ?? false,
        recurrencePattern: data.recurrencePattern,
        prerequisiteMissionId: data.prerequisiteMissionId,
        targetType: data.targetType as TargetType || 'all',
        targetPlayers: data.targetPlayers
      })
      .returning();

    return result[0] as Mission;
  }

  /**
   * Update existing mission
   * @param id Mission ID
   * @param data Mission data to update
   * @returns Updated mission or null if not found
   */
  async update(id: number, data: Partial<Mission>): Promise<Mission | null> {
    const result = await this.db
      .update(missions)
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
        targetType: data.targetType as any,
        targetPlayers: data.targetPlayers,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(missions.id, id))
      .returning();

    return result.length ? result[0] as Mission : null;
  }

  /**
   * Delete mission
   * @param id Mission ID
   * @returns True if deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(missions)
      .where(eq(missions.id, id))
      .returning({ id: missions.id });

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
  async updateProgress(
    playerId: number,
    missionId: number,
    status: MissionStatus,
    pointsEarned: number = 0,
    progress: number = 0
  ): Promise<Mission | null> {
    const now = new Date().toISOString();
    
    // Check if progress record exists
    const existingProgress = await this.db
      .select()
      .from(playerMissionProgress)
      .where(
        and(
          eq(playerMissionProgress.playerId, playerId),
          eq(playerMissionProgress.missionId, missionId)
        )
      )
      .limit(1);

    // Get mission to get game ID
    const mission = await this.findById(missionId);
    if (!mission) {
      throw new Error(`Mission with ID ${missionId} not found`);
    }

    // Prepare update data based on status
    const updateData: any = {
      status,
      pointsEarned,
      progress,
      updatedAt: now
    };
    
    if (status === 'completed') {
      updateData.completedAt = now;
    } else if (status === 'skipped') {
      updateData.skippedAt = now;
    }

    if (existingProgress.length) {
      // Update existing progress
      await this.db
        .update(playerMissionProgress)
        .set(updateData)
        .where(
          and(
            eq(playerMissionProgress.playerId, playerId),
            eq(playerMissionProgress.missionId, missionId)
          )
        );
    } else {
      // Create new progress record
      await this.db
        .insert(playerMissionProgress)
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