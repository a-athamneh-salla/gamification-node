import { and, eq, sql } from 'drizzle-orm';
import { BaseRepository } from './base-repository';
import { tasks, storeTaskProgress, events } from '../db/schema';
import { Task, TaskStatus, TaskWithProgress } from '../types';
import { DB } from '../db';

/**
 * Task Repository
 * Handles data access for the Task entity
 */
export class TaskRepository extends BaseRepository<Task> {
  constructor(db: DB) {
    super(db, 'tasks');
  }

  /**
   * Find task by ID
   * @param id Task ID
   * @returns Task or null if not found
   */
  async findById(id: number): Promise<Task | null> {
    const result = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    return result.length ? result[0] as Task : null;
  }

  /**
   * Find task by ID with progress for a specific store
   * @param storeId Store ID
   * @param taskId Task ID
   * @returns TaskWithProgress or null if not found
   */
  async findByIdForStore(storeId: number, taskId: number): Promise<TaskWithProgress | null> {
    const result = await this.db
      .select({
        task: tasks,
        progress: storeTaskProgress
      })
      .from(tasks)
      .leftJoin(
        storeTaskProgress, 
        and(
          eq(storeTaskProgress.taskId, tasks.id),
          eq(storeTaskProgress.storeId, storeId)
        )
      )
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!result.length) {
      return null;
    }

    const { task, progress } = result[0];
    
    return {
      ...task as Task,
      status: progress?.status || 'not_started',
      completedAt: progress?.completedAt,
      skippedAt: progress?.skippedAt
    } as TaskWithProgress;
  }

  /**
   * Find all tasks with pagination
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object containing tasks array and total count
   */
  async findAll(page: number = 1, limit: number = 10): Promise<{ items: Task[], total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
    
    const result = await this.db
      .select()
      .from(tasks)
      .limit(limitParam)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql`count(*)` })
      .from(tasks);

    return {
      items: result as Task[],
      total: Number(countResult[0].count)
    };
  }

  /**
   * Find tasks by mission ID with progress for a specific store
   * @param storeId Store ID
   * @param missionId Mission ID
   * @returns Array of tasks with progress information
   */
  async findByMissionForStore(storeId: number, missionId: number): Promise<TaskWithProgress[]> {
    const result = await this.db
      .select({
        task: tasks,
        progress: storeTaskProgress
      })
      .from(tasks)
      .leftJoin(
        storeTaskProgress, 
        and(
          eq(storeTaskProgress.taskId, tasks.id),
          eq(storeTaskProgress.storeId, storeId)
        )
      )
      .where(eq(tasks.missionId, missionId))
      .orderBy(tasks.order);

    return result.map(({ task, progress }) => ({
      ...task as Task,
      status: progress?.status || 'not_started',
      completedAt: progress?.completedAt,
      skippedAt: progress?.skippedAt
    })) as TaskWithProgress[];
  }

  /**
   * Find tasks by event ID
   * @param eventId Event ID
   * @returns Array of tasks
   */
  async findByEventId(eventId: number): Promise<Task[]> {
    const result = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.eventId, eventId));

    return result as Task[];
  }

  /**
   * Create new task
   * @param data Task data
   * @returns Created task
   */
  async create(data: Partial<Task>): Promise<Task> {
    if (!data.missionId || !data.eventId) {
      throw new Error('Mission ID and Event ID are required');
    }

    const result = await this.db
      .insert(tasks)
      .values({
        missionId: data.missionId,
        eventId: data.eventId,
        name: data.name as string,
        description: data.description,
        points: data.points ?? 0,
        isOptional: data.isOptional ?? false,
        order: data.order ?? 0,
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
        updatedAt: sql`CURRENT_TIMESTAMP`
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
   * Update task progress for a store
   * @param storeId Store ID
   * @param taskId Task ID
   * @param status Task status
   * @returns Updated progress or null if error
   */
  async updateProgress(storeId: number, taskId: number, status: TaskStatus): Promise<any> {
    // Check if progress entry exists
    const existing = await this.db
      .select()
      .from(storeTaskProgress)
      .where(
        and(
          eq(storeTaskProgress.taskId, taskId),
          eq(storeTaskProgress.storeId, storeId)
        )
      )
      .limit(1);

    const now = new Date().toISOString();
    const statusFields: Record<TaskStatus, Partial<typeof storeTaskProgress.$inferInsert>> = {
      completed: { status, completedAt: now },
      skipped: { status, skippedAt: now },
      not_started: { status }
    };
    
    if (existing.length) {
      // Update existing progress
      const result = await this.db
        .update(storeTaskProgress)
        .set({
          ...statusFields[status],
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(
          and(
            eq(storeTaskProgress.taskId, taskId),
            eq(storeTaskProgress.storeId, storeId)
          )
        )
        .returning();
      
      return result[0];
    } else {
      // Create new progress entry
      const result = await this.db
        .insert(storeTaskProgress)
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
  async getTaskWithEvent(taskId: number): Promise<Task | null> {
    const result = await this.db
      .select({
        task: tasks,
        event: events
      })
      .from(tasks)
      .leftJoin(events, eq(tasks.eventId, events.id))
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!result.length) {
      return null;
    }

    const { task, event } = result[0];
    // Merge the task data with event in a format that matches the Task type
    return {
      ...task as Task,
      event: event
    } as Task;
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
  async findByStore(
    storeId: number,
    missionId?: number,
    status: TaskStatus | 'all' = 'all',
    page: number = 1,
    limit: number = 10
  ): Promise<{ tasks: TaskWithProgress[], total: number }> {
    const { offset, limit: limitParam } = this.getPaginationParams(page, limit);
    
    // Start building the query
    let query = this.db
      .select({
        task: tasks,
        progress: storeTaskProgress
      })
      .from(tasks)
      .leftJoin(
        storeTaskProgress, 
        and(
          eq(storeTaskProgress.taskId, tasks.id),
          eq(storeTaskProgress.storeId, storeId)
        )
      );
    
    // Add mission filter if provided
    if (missionId) {
      query = query.where(eq(tasks.missionId, missionId));
    }
    
    // Add status filter if provided and not 'all'
    if (status !== 'all') {
      query = query.where(eq(storeTaskProgress.status, status));
    }
    
    // Execute the query with pagination
    const result = await query
      .orderBy(tasks.missionId, tasks.order)
      .limit(limitParam)
      .offset(offset);
    
    // Count total tasks matching the criteria
    const countQuery = this.db.select({ count: sql`count(*)` }).from(tasks);
    
    // Apply the same filters to count query
    if (missionId) {
      countQuery.where(eq(tasks.missionId, missionId));
    }
    
    const countResult = await countQuery;
    
    // Format the tasks for response
    const formattedTasks = result.map(({ task, progress }) => ({
      ...task as Task,
      status: progress?.status || 'not_started',
      completedAt: progress?.completedAt,
      skippedAt: progress?.skippedAt
    })) as TaskWithProgress[];
    
    return {
      tasks: formattedTasks,
      total: Number(countResult[0].count)
    };
  }
}