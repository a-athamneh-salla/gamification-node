import { eq, and, sql, or, isNull, ne } from 'drizzle-orm';
import { BaseRepository } from './base-repository';
import { tasks, playerTaskProgress, missions } from '../db/schema';
import { Task, TaskStatus } from '../types';
import { DB } from '../db';

/**
 * Task Repository
 * Handles data access for the Task entity
 */
export class TaskRepository extends BaseRepository<Task> {
  constructor(db: DB) {
    super(db, 'tasks');
  }

  private formatTask(row: any, progress?: any): Task {
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
  async findAll(page: number = 1, limit: number = 10): Promise<{ items: Task[], total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
    
    const items = await this.db
      .select()
      .from(tasks)
      .limit(limitParam)
      .offset(offset);
    
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(tasks);
    
    return {
      items: items as Task[],
      total: Number(count)
    };
  }

  /**
   * Find task by ID
   * @param id Task ID
   * @returns Task or null if not found
   */
  async findById(id: number): Promise<Task | null> {
    const result = await this.db
      .select({
        id: tasks.id,
        missionId: tasks.missionId,
        eventId: tasks.eventId,
        name: tasks.name,
        description: tasks.description,
        points: tasks.points,
        isOptional: tasks.isOptional,
        order: tasks.order,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt
      })
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!result.length) return null;

    return {
      ...result[0],
      description: result[0].description || undefined
    } as Task;
  }

  /**
   * Find task by ID with related event
   * @param id Task ID
   * @returns Task with event information or null if not found
   */
  async getTaskWithEvent(id: number): Promise<any> {
    // This would typically join with the events table to get event details
    const result = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
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
  async findByPlayerAndMission(
    playerId: number,
    missionId: number,
    status: TaskStatus | 'all' = 'all',
    page: number = 1,
    limit: number = 10
  ): Promise<{ tasks: Task[], total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
    
    // Get tasks for this mission with progress info
    const result = await this.db
      .select()
      .from(tasks)
      .leftJoin(
        playerTaskProgress,
        and(
          eq(playerTaskProgress.taskId, tasks.id),
          eq(playerTaskProgress.playerId, playerId)
        )
      )
      .where(eq(tasks.missionId, missionId))
      .orderBy(tasks.order)
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
      .select({ count: sql`count(*)` })
      .from(tasks)
      .where(eq(tasks.missionId, missionId));

    // Add progress info to tasks
    const tasksWithStatus = filteredResult.map(row => ({
      ...row.tasks,
      status: row.player_task_progress?.status || 'not_started',
      completedAt: row.player_task_progress?.completedAt,
      skippedAt: row.player_task_progress?.skippedAt
    }));

    return {
      tasks: tasksWithStatus as Task[],
      total: Number(countResult[0].count)
    };
  }

  /**
   * Find task by ID for a specific player with progress information
   * @param playerId Player ID
   * @param taskId Task ID
   * @returns Task with progress information or null if not found
   */
  async findByIdForPlayer(playerId: number, taskId: number): Promise<Task | null> {
    const result = await this.db
      .select()
      .from(tasks)
      .leftJoin(
        playerTaskProgress,
        and(
          eq(playerTaskProgress.taskId, tasks.id),
          eq(playerTaskProgress.playerId, playerId)
        )
      )
      .where(eq(tasks.id, taskId))
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
    } as Task;
  }

  /**
   * Update task progress for a player
   * @param playerId Player ID
   * @param taskId Task ID
   * @param status New status
   * @returns Updated task with progress information
   */
  async updateProgress(
    playerId: number,
    taskId: number,
    status: TaskStatus
  ): Promise<Task | null> {
    const now = new Date().toISOString();
    
    // Check if progress record exists
    const existingProgress = await this.db
      .select()
      .from(playerTaskProgress)
      .where(
        and(
          eq(playerTaskProgress.playerId, playerId),
          eq(playerTaskProgress.taskId, taskId)
        )
      )
      .limit(1);

    // Get task to get game ID
    const task = await this.findById(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    // Prepare update data based on status
    const updateData: any = {
      status,
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
        .update(playerTaskProgress)
        .set(updateData)
        .where(
          and(
            eq(playerTaskProgress.playerId, playerId),
            eq(playerTaskProgress.taskId, taskId)
          )
        );
    } else {
      // Create new progress record
      await this.db
        .insert(playerTaskProgress)
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
  async create(data: Partial<Task>): Promise<Task> {
    const result = await this.db
      .insert(tasks)
      .values({
        name: data.name!,
        description: data.description,
        missionId: data.missionId!,
        eventId: data.eventId!,
        points: data.points || 0,
        isOptional: data.isOptional ?? false,
        isActive: data.isActive ?? true,
        requiredProgress: data.requiredProgress || 1,
        order: data.order || 0
      })
      .returning();

    return result[0] as Task;
  }

  /**
   * Update existing task
   * @param id Task ID
   * @param data Task data to update
   * @returns Updated task or null if not found
   */
  async update(id: number, data: Partial<Task>): Promise<Task | null> {
    const result = await this.db
      .update(tasks)
      .set({
        name: data.name,
        description: data.description,
        points: data.points,
        isOptional: data.isOptional,
        order: data.order,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(tasks.id, id))
      .returning();

    return result.length ? result[0] as Task : null;
  }

  /**
   * Delete task
   * @param id Task ID
   * @returns True if deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id });

    return result.length > 0;
  }

  /**
   * Find tasks by event ID
   * @param eventId Event ID
   * @returns Array of tasks
   */
  async findByEventId(eventId: string): Promise<Task[]> {
    const result = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.eventId, eventId));

    return result.map(task => ({
      ...task,
      description: task.description ?? undefined
    })) as Task[];
  }

  /**
   * Find tasks for a mission
   * @param missionId Mission ID
   * @returns Tasks array
   */
  async findByMission(missionId: number): Promise<Task[]> {
    try {
      const result = await this.db.select()
        .from(tasks)
        .where(eq(tasks.missionId, missionId));
      
      return result.map(task => ({
        ...task,
        description: task.description ?? undefined
      })) as Task[];
    } catch (error) {
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
  async findByPlayer(
    playerId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ tasks: Task[], total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
    
    // Get all tasks with progress info for this player
    const result = await this.db
      .select()
      .from(tasks)
      .leftJoin(
        playerTaskProgress,
        and(
          eq(playerTaskProgress.taskId, tasks.id),
          eq(playerTaskProgress.playerId, playerId)
        )
      )
      .orderBy(tasks.missionId, tasks.order)
      .limit(limitParam)
      .offset(offset);

    // Count total tasks
    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(tasks);

    // Add progress info to tasks
    const tasksWithStatus = result.map(row => ({
      ...row.tasks,
      status: row.player_task_progress?.status || 'not_started',
      completedAt: row.player_task_progress?.completedAt,
      skippedAt: row.player_task_progress?.skippedAt
    }));

    return {
      tasks: tasksWithStatus as Task[],
      total: Number(countResult[0].count)
    };
  }

  /**
   * Find tasks by mission ID
   * @param missionId Mission ID
   * @returns Array of tasks
   */
  async findByMissionId(missionId: number): Promise<Task[]> {
    const result = await this.db
      .select({
        id: tasks.id,
        missionId: tasks.missionId,
        eventId: tasks.eventId,
        name: tasks.name,
        description: tasks.description,
        points: tasks.points,
        isOptional: tasks.isOptional,
        order: tasks.order,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt
      })
      .from(tasks)
      .where(eq(tasks.missionId, missionId))
      .orderBy(tasks.order);

    return result.map(row => ({
      ...row,
      description: row.description || undefined
    })) as Task[];
  }

  /**
   * Find task by player ID and task ID
   * @param playerId Player ID
   * @param taskId Task ID
   * @returns Task with progress information or null if not found
   */
  async findByPlayerAndTaskId(playerId: number, taskId: number): Promise<Task | null> {
    const result = await this.db
      .select({
        id: tasks.id,
        missionId: tasks.missionId,
        eventId: tasks.eventId,
        name: tasks.name,
        description: tasks.description,
        points: tasks.points,
        isOptional: tasks.isOptional,
        order: tasks.order,
        status: playerTaskProgress.status,
        progress: sql<number>`COALESCE(${playerTaskProgress.progress}, 0)`,
        completedAt: playerTaskProgress.completedAt,
        skippedAt: playerTaskProgress.skippedAt,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt
      })
      .from(tasks)
      .leftJoin(
        playerTaskProgress,
        and(
          eq(playerTaskProgress.taskId, tasks.id),
          eq(playerTaskProgress.playerId, playerId)
        )
      )
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!result.length) return null;

    return {
      ...result[0],
      description: result[0].description || undefined,
      status: result[0].status || 'not_started'
    } as Task;
  }

  /**
   * Find incomplete tasks by event ID and player ID
   * @param playerId Player ID
   * @param eventId Event ID
   * @returns Array of incomplete tasks
   */
  async findIncompleteTasksByEvent(playerId: number, eventId: string): Promise<Task[]> {
    const result = await this.db
      .select()
      .from(tasks)
      .leftJoin(
        playerTaskProgress,
        and(
          eq(playerTaskProgress.taskId, tasks.id),
          eq(playerTaskProgress.playerId, playerId)
        )
      )
      .where(
        and(
          eq(tasks.eventId, eventId),
          or(
            isNull(playerTaskProgress.status),
            ne(playerTaskProgress.status, 'completed')
          )
        )
      );

    return result.map(row => ({
      ...row.tasks,
      description: row.tasks.description || undefined,
      status: row.player_task_progress?.status || 'not_started'
    })) as Task[];
  }

  /**
   * Update player task progress
   * @param playerId Player ID
   * @param taskId Task ID
   * @param status Task status
   * @returns Updated task with progress information
   */
  async updatePlayerTaskProgress(
    playerId: number,
    taskId: number,
    status: TaskStatus
  ): Promise<Task> {
    const now = new Date().toISOString();
    const task = await this.findById(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Get mission to get game ID
    const mission = await this.db
      .select()
      .from(missions)
      .where(eq(missions.id, task.missionId))
      .limit(1);

    if (!mission.length) {
      throw new Error(`Mission ${task.missionId} not found`);
    }

    // Update or insert progress
    await this.db
      .insert(playerTaskProgress)
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
        target: [playerTaskProgress.playerId, playerTaskProgress.taskId],
        set: {
          status,
          completedAt: status === 'completed' ? now : null,
          skippedAt: status === 'skipped' ? now : null,
          updatedAt: now
        }
      });

    return this.findByPlayerAndTaskId(playerId, taskId) as Promise<Task>;
  }

  async findByEvent(eventId: string): Promise<Task[]> {
    const result = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.eventId, eventId.toString()));

    return result.map(row => this.formatTask(row));
  }

  async findByEventWithProgress(eventId: string, playerId: number): Promise<Task[]> {
    const result = await this.db
      .select()
      .from(tasks)
      .leftJoin(
        playerTaskProgress,
        and(
          eq(playerTaskProgress.taskId, tasks.id),
          eq(playerTaskProgress.playerId, playerId)
        )
      )
      .where(eq(tasks.eventId, eventId.toString()));

    return result.map(row => this.formatTask(row.tasks, row.player_task_progress));
  }

  /**
   * Find all tasks by event type
   * @param eventType The event type
   * @returns Array of tasks
   */
  async findByEventType(eventType: string): Promise<Task[]> {
    const result = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.eventId, eventType))
      .orderBy(tasks.order);
    
    return result as Task[];
  }
  
  /**
   * Find all completed tasks for a mission by player
   * @param missionId The mission ID
   * @param playerId The player ID
   * @returns Array of completed tasks
   */
  async findAllCompletedTasksByMission(missionId: number, playerId: number): Promise<Task[]> {
    const result = await this.db
      .select({
        task: tasks,
        progress: playerTaskProgress
      })
      .from(tasks)
      .innerJoin(
        playerTaskProgress,
        and(
          eq(tasks.id, playerTaskProgress.taskId),
          eq(playerTaskProgress.playerId, playerId),
          eq(playerTaskProgress.status, 'completed')
        )
      )
      .where(eq(tasks.missionId, missionId))
      .orderBy(tasks.order);
    
    return result.map(row => ({
      ...row.task,
      status: row.progress.status,
      progress: row.progress.progress,
      completedAt: row.progress.completedAt,
      skippedAt: row.progress.skippedAt
    })) as Task[];
  }
}