import { DB } from '../db';
import { TaskRepository } from '../repositories/task-repository';
import { MissionRepository } from '../repositories/mission-repository';

/**
 * Task Service
 * Handles business logic for tasks
 */
export class TaskService {
  private db: DB;
  private taskRepository: TaskRepository;
  private missionRepository: MissionRepository;

  constructor(db: DB) {
    this.db = db;
    this.taskRepository = new TaskRepository(db);
    this.missionRepository = new MissionRepository(db);
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
        const completedOrSkippedTasks = tasks.filter(t => 
          t.status === 'completed' || t.status === 'skipped' || t.isOptional
        ).length;
        
        // If all tasks are now completed/skipped, mark mission as completed
        if (completedOrSkippedTasks === tasks.length) {
          // Calculate points earned from completed (not skipped) tasks
          const pointsEarned = tasks.reduce((sum, t) => {
            if (t.status === 'completed') {
              return sum + t.points;
            }
            return sum;
          }, 0);
          
          // Update mission progress in a separate function or repository
          // This is simplified for now - you would typically update the mission progress here
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
    return tasks.sort((a, b) => a.order - b.order);
  }
}