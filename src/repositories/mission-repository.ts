import { and, eq, sql, isNull, lte, gte, or } from 'drizzle-orm';
import { BaseRepository } from './base-repository';
import { missions, storeMissionProgress, tasks } from '../db/schema';
import { Mission, MissionStatus, MissionWithTasks } from '../types';
import { DB } from '../db';

/**
 * Mission Repository
 * Handles data access for the Mission entity
 */
export class MissionRepository extends BaseRepository<Mission> {
  constructor(db: DB) {
    super(db, 'missions');
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
   * Find all missions with pagination
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object containing missions array and total count
   */
  async findAll(page: number = 1, limit: number = 10): Promise<{ items: Mission[], total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
    
    const result = await this.db
      .select()
      .from(missions)
      .limit(limitParam)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(missions);

    return {
      items: result as Mission[],
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
  async findByStore(
    storeId: number, 
    status: MissionStatus | 'all' = 'all', 
    page: number = 1, 
    limit: number = 10
  ): Promise<{ missions: MissionWithTasks[], total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
    const currentDate = new Date().toISOString();
    
    // Build the filter conditions for active missions that are available to this store
    const conditions = and(
      eq(missions.isActive, true),
      or(
        eq(missions.targetType, 'all'),
        sql`json_extract(${missions.targetStores}, '$') LIKE '%${storeId}%'`
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

    // Join with storeMissionProgress to get the mission status for the specific store
    const result = await this.db
      .select({
        mission: missions,
        progress: storeMissionProgress
      })
      .from(missions)
      .leftJoin(
        storeMissionProgress, 
        and(
          eq(storeMissionProgress.missionId, missions.id),
          eq(storeMissionProgress.storeId, storeId)
        )
      )
      .where(conditions)
      .limit(limitParam)
      .offset(offset);

    // Count total missions matching the criteria
    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(missions)
      .where(conditions);

    // Now fetch the tasks for each mission
    const missionIds = result.map(r => r.mission.id);
    const taskResults = await this.db
      .select()
      .from(tasks)
      .where(
        missionIds.length > 0 
          ? sql`${tasks.missionId} IN (${missionIds.join(',')})` 
          : sql`1 = 0`
      );

    // Group tasks by mission ID
    const tasksByMission = taskResults.reduce((acc: Record<number, any[]>, task) => {
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
      } as unknown as MissionWithTasks;
    });

    // Apply status filtering if needed
    const filteredMissions = status === 'all' 
      ? missionsWithTasks 
      : missionsWithTasks.filter(m => m.status === status);

    return {
      missions: filteredMissions,
      total: filteredMissions.length
    };
  }

  /**
   * Find mission by ID with tasks and progress for a specific store
   * @param storeId Store ID
   * @param missionId Mission ID
   * @returns MissionWithTasks or null if not found
   */
  async findByIdForStore(storeId: number, missionId: number): Promise<MissionWithTasks | null> {
    // Get the mission
    const missionResult = await this.db
      .select()
      .from(missions)
      .where(eq(missions.id, missionId))
      .limit(1);

    if (!missionResult.length) {
      return null;
    }

    const mission = missionResult[0] as Mission;

    // Get the mission progress for this store
    const progressResult = await this.db
      .select()
      .from(storeMissionProgress)
      .where(
        and(
          eq(storeMissionProgress.missionId, missionId),
          eq(storeMissionProgress.storeId, storeId)
        )
      )
      .limit(1);

    // Get tasks for this mission
    const taskResults = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.missionId, missionId));

    // Combine mission with tasks and progress data
    const missionWithProgress = {
      ...mission,
      tasks: taskResults as any[],
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
    } as unknown as MissionWithTasks;
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
        name: data.name as string,
        description: data.description,
        pointsRequired: data.pointsRequired ?? 0,
        isActive: data.isActive ?? true,
        startDate: data.startDate,
        endDate: data.endDate,
        isRecurring: data.isRecurring ?? false,
        recurrencePattern: data.recurrencePattern,
        prerequisiteMissionId: data.prerequisiteMissionId,
        targetType: data.targetType as "all" | "specific" | "filtered" || 'all',
        targetStores: data.targetStores
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
        targetStores: data.targetStores,
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
}