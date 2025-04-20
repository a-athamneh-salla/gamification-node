import { DB } from '../db';
import { TaskRepository } from '../repositories/task-repository';
import { MissionRepository } from '../repositories/mission-repository';
import { Task, TaskStatus, TaskWithProgress } from '../types';

/**
 * Task Service
 * Handles business logic for tasks
 */
export class TaskService {
  private taskRepository: TaskRepository;
  private missionRepository: MissionRepository;

  constructor(db: DB) {
    this.taskRepository = new TaskRepository(db);
    this.missionRepository = new MissionRepository(db);
  }

  /**
   * Get tasks for a specific store with pagination
   * @param storeId Store ID
   * @param missionId Optional mission ID filter
   * @param status Optional status filter
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object with tasks and total count
   */
  async getTasksByStore(
    storeId: number,
    missionId?: number,
    status?: TaskStatus | 'all',
    page: number = 1,
    limit: number = 10
  ): Promise<{ tasks: TaskWithProgress[]; total: number }> {
    return this.taskRepository.findByStore(storeId, missionId, status, page, limit);
  }

  /**
   * Get task with detailed progress for a store
   * @param storeId Store ID
   * @param taskId Task ID
   * @returns Task with progress information or null if not found
   */
  async getTaskWithProgress(storeId: number, taskId: number): Promise<TaskWithProgress | null> {
    return this.taskRepository.findByIdForStore(storeId, taskId);
  }

  /**
   * Get a task by ID (without store context)
   * @param taskId Task ID
   * @returns Task or null if not found
   */
  async getTaskById(taskId: number): Promise<Task | null> {
    return this.taskRepository.findById(taskId);
  }

  /**
   * Skip a task for a specific store
   * @param storeId Store ID
   * @param taskId Task ID
   * @returns Object indicating success or failure
   */
  async skipTask(storeId: number, taskId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Get task with progress information
      const task = await this.taskRepository.findByIdForStore(storeId, taskId);
      
      if (!task) {
        return {
          success: false,
          message: `Task with ID ${taskId} not found`
        };
      }
      
      // Check if task is already completed or skipped
      if (task.status === 'completed') {
        return {
          success: false,
          message: 'Task is already completed and cannot be skipped'
        };
      }
      
      if (task.status === 'skipped') {
        return {
          success: false,
          message: 'Task is already skipped'
        };
      }
      
      // Check if task is optional
      if (!task.isOptional) {
        // Get the task with event details to include in the error message
        const taskWithEvent = await this.taskRepository.getTaskWithEvent(taskId);
        
        return {
          success: false,
          message: `Task "${taskWithEvent?.name}" is required and cannot be skipped`
        };
      }
      
      // Update task status to skipped
      await this.taskRepository.updateProgress(storeId, taskId, 'skipped');
      
      // Update mission progress
      const mission = await this.missionRepository.findByIdForStore(
        storeId,
        task.missionId
      );
      
      if (mission) {
        // Recalculate mission progress
        const tasks = mission.tasks || [];
        
        // Count completed and skipped tasks
        const completedOrSkippedTasks = tasks.filter((t: any) => 
          t.status === 'completed' || t.status === 'skipped' || t.isOptional
        ).length;
        
        // If all tasks are now completed/skipped, mark mission as completed
        if (completedOrSkippedTasks === tasks.length) {
          // Calculate total points earned (for record-keeping only)
          tasks.reduce((sum: number, t: any) => {
            if (t.status === 'completed') {
              return sum + t.points;
            }
            return sum;
          }, 0);
        }
      }
      
      return {
        success: true,
        message: 'Task skipped successfully'
      };
    } catch (error: any) {
      console.error('Error skipping task:', error);
      return {
        success: false,
        message: `Error skipping task: ${error.message}`
      };
    }
  }

  /**
   * Get tasks for a mission with progress information
   * @param storeId Store ID
   * @param missionId Mission ID
   * @returns Array of tasks with progress information
   */
  async getTasksForMission(storeId: number, missionId: number) {
    const tasks = await this.taskRepository.findByMissionForStore(storeId, missionId);
    
    // Sort tasks by order
    return tasks.sort((a: any, b: any) => a.order - b.order);
  }
}