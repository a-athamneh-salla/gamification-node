import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { TaskService } from '../../../src/services/task-service';
import { TaskRepository } from '../../../src/repositories/task-repository';
import { MissionRepository } from '../../../src/repositories/mission-repository';

// Mock repositories
jest.mock('../../../src/repositories/task-repository');
jest.mock('../../../src/repositories/mission-repository');

describe('TaskService', () => {
  let taskService: TaskService;
  let mockDb: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock DB
    mockDb = {
      query: {
        storeMissionProgress: {
          findFirst: jest.fn()
        }
      }
    };
    
    // Initialize service with mock DB
    taskService = new TaskService(mockDb as any);
  });
  
  describe('skipTask', () => {
    it('should skip an optional task successfully', async () => {
      // Mock task with progress (optional task that can be skipped)
      (TaskRepository.prototype.findByIdForStore as jest.Mock).mockResolvedValue({
        id: 1,
        missionId: 1,
        eventId: 1,
        name: 'Subscribe to Newsletter',
        description: 'Subscribe to marketing newsletter',
        points: 10,
        isOptional: true,
        order: 3,
        status: 'not_started'
      });
      
      // Mock mission data with tasks
      (MissionRepository.prototype.findByIdForStore as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Marketing Setup',
        description: 'Set up your marketing',
        pointsRequired: 30,
        isActive: true,
        targetType: 'all',
        tasks: [
          {
            id: 1,
            missionId: 1,
            eventId: 1,
            name: 'Subscribe to Newsletter',
            description: 'Subscribe to marketing newsletter',
            points: 10,
            isOptional: true,
            order: 3,
            status: 'not_started'
          },
          {
            id: 2,
            missionId: 1,
            eventId: 2,
            name: 'Create Discount Code',
            description: 'Create your first discount code',
            points: 20,
            isOptional: false,
            order: 1,
            status: 'completed'
          }
        ]
      });
      
      // Execute skip task
      const result = await taskService.skipTask(123, 1);
      
      // Assertions
      expect(result).toEqual({
        success: true,
        message: 'Task skipped successfully'
      });
      
      // Verify task status was updated
      expect(TaskRepository.prototype.updateProgress).toHaveBeenCalledWith(
        123, 1, 'skipped'
      );
    });
    
    it('should not allow skipping a required task', async () => {
      // Mock task with progress (required task that cannot be skipped)
      (TaskRepository.prototype.findByIdForStore as jest.Mock).mockResolvedValue({
        id: 2,
        missionId: 1,
        eventId: 2,
        name: 'Create Discount Code',
        description: 'Create your first discount code',
        points: 20,
        isOptional: false,
        order: 1,
        status: 'not_started'
      });
      
      // Mock getting task with event details
      (TaskRepository.prototype.getTaskWithEvent as jest.Mock).mockResolvedValue({
        id: 2,
        missionId: 1,
        eventId: 2,
        name: 'Create Discount Code',
        description: 'Create your first discount code',
        points: 20,
        isOptional: false,
        order: 1,
        status: 'not_started',
        event: {
          id: 2,
          name: 'Discount Created',
          description: 'A discount code was created'
        }
      });
      
      // Execute skip task
      const result = await taskService.skipTask(123, 2);
      
      // Assertions
      expect(result).toEqual({
        success: false,
        message: 'Task "Create Discount Code" is required and cannot be skipped'
      });
      
      // Verify task status was NOT updated
      expect(TaskRepository.prototype.updateProgress).not.toHaveBeenCalled();
    });
    
    it('should not allow skipping an already completed task', async () => {
      // Mock task with progress (already completed)
      (TaskRepository.prototype.findByIdForStore as jest.Mock).mockResolvedValue({
        id: 2,
        missionId: 1,
        eventId: 2,
        name: 'Create Discount Code',
        description: 'Create your first discount code',
        points: 20,
        isOptional: true, // even optional tasks can't be skipped if already completed
        order: 1,
        status: 'completed'
      });
      
      // Execute skip task
      const result = await taskService.skipTask(123, 2);
      
      // Assertions
      expect(result).toEqual({
        success: false,
        message: 'Task is already completed and cannot be skipped'
      });
      
      // Verify task status was NOT updated
      expect(TaskRepository.prototype.updateProgress).not.toHaveBeenCalled();
    });
    
    it('should not allow skipping an already skipped task', async () => {
      // Mock task with progress (already skipped)
      (TaskRepository.prototype.findByIdForStore as jest.Mock).mockResolvedValue({
        id: 1,
        missionId: 1,
        eventId: 1,
        name: 'Subscribe to Newsletter',
        description: 'Subscribe to marketing newsletter',
        points: 10,
        isOptional: true,
        order: 3,
        status: 'skipped'
      });
      
      // Execute skip task
      const result = await taskService.skipTask(123, 1);
      
      // Assertions
      expect(result).toEqual({
        success: false,
        message: 'Task is already skipped'
      });
      
      // Verify task status was NOT updated
      expect(TaskRepository.prototype.updateProgress).not.toHaveBeenCalled();
    });
    
    it('should handle task not found case', async () => {
      // Mock task not found
      (TaskRepository.prototype.findByIdForStore as jest.Mock).mockResolvedValue(null);
      
      // Execute skip task
      const result = await taskService.skipTask(123, 999);
      
      // Assertions
      expect(result).toEqual({
        success: false,
        message: 'Task with ID 999 not found'
      });
      
      // Verify task status was NOT updated
      expect(TaskRepository.prototype.updateProgress).not.toHaveBeenCalled();
    });
  });
  
  describe('getTasksForMission', () => {
    it('should return tasks for a mission sorted by order', async () => {
      // Mock tasks for mission
      const mockTasks = [
        {
          id: 3,
          missionId: 1,
          eventId: 3,
          name: 'Send Marketing Email',
          description: 'Send your first marketing email',
          points: 15,
          isOptional: false,
          order: 2,
          status: 'not_started'
        },
        {
          id: 2,
          missionId: 1,
          eventId: 2,
          name: 'Create Discount Code',
          description: 'Create your first discount code',
          points: 20,
          isOptional: false,
          order: 1,
          status: 'completed'
        },
        {
          id: 1,
          missionId: 1,
          eventId: 1,
          name: 'Subscribe to Newsletter',
          description: 'Subscribe to marketing newsletter',
          points: 10,
          isOptional: true,
          order: 3,
          status: 'not_started'
        }
      ];
      
      (TaskRepository.prototype.findByMissionForStore as jest.Mock).mockResolvedValue(mockTasks);
      
      // Execute get tasks
      const result = await taskService.getTasksForMission(123, 1);
      
      // Assertions - check tasks are sorted by order
      expect(result).toEqual([
        {
          id: 2,
          missionId: 1,
          eventId: 2,
          name: 'Create Discount Code',
          description: 'Create your first discount code',
          points: 20,
          isOptional: false,
          order: 1,
          status: 'completed'
        },
        {
          id: 3,
          missionId: 1,
          eventId: 3,
          name: 'Send Marketing Email',
          description: 'Send your first marketing email',
          points: 15,
          isOptional: false,
          order: 2,
          status: 'not_started'
        },
        {
          id: 1,
          missionId: 1,
          eventId: 1,
          name: 'Subscribe to Newsletter',
          description: 'Subscribe to marketing newsletter',
          points: 10,
          isOptional: true,
          order: 3,
          status: 'not_started'
        }
      ]);
    });
  });
});