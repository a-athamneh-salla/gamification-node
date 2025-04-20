import { EventProcessorService } from '../../../src/services/event-processor';
import { EventRepository } from '../../../src/repositories/event-repository';
import { TaskRepository } from '../../../src/repositories/task-repository';
import { MissionRepository } from '../../../src/repositories/mission-repository';
import { EventPayload } from '../../../src/types';

// Mock DB and repositories
jest.mock('../../../src/repositories/event-repository');
jest.mock('../../../src/repositories/task-repository');
jest.mock('../../../src/repositories/mission-repository');

describe('EventProcessorService', () => {
  let eventProcessorService: EventProcessorService;
  let mockDb: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock DB
    mockDb = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 1 }])
        })
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 1 }])
          })
        })
      }),
      query: {
        storeMissionProgress: {
          findFirst: jest.fn().mockResolvedValue(null)
        }
      }
    };
    
    // Initialize service with mock DB
    eventProcessorService = new EventProcessorService(mockDb as any);
  });
  
  describe('processEvent', () => {
    it('should process an event and update task and mission progress', async () => {
      // Mock event payload
      const payload: EventPayload = {
        event: 'Product Added',
        store_id: 123,
        timestamp: new Date().toISOString()
      };
      
      // Mock event repository
      (EventRepository.prototype.findByName as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Product Added',
        description: 'Product was added to store'
      });
      
      // Mock tasks related to the event
      (TaskRepository.prototype.findByEventId as jest.Mock).mockResolvedValue([
        {
          id: 1,
          missionId: 1,
          eventId: 1,
          name: 'Add a Product',
          description: 'Add your first product',
          points: 25,
          isOptional: false,
          order: 1
        }
      ]);
      
      // Mock task progress check (task not completed yet)
      (TaskRepository.prototype.findByIdForStore as jest.Mock).mockResolvedValue({
        id: 1,
        missionId: 1,
        eventId: 1,
        name: 'Add a Product',
        description: 'Add your first product',
        points: 25,
        isOptional: false,
        order: 1,
        status: 'not_started'
      });
      
      // Mock mission details with tasks
      (MissionRepository.prototype.findByIdForStore as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Store Setup',
        description: 'Set up your store',
        pointsRequired: 100,
        isActive: true,
        targetType: 'all',
        tasks: [
          {
            id: 1,
            missionId: 1,
            eventId: 1,
            name: 'Add a Product',
            description: 'Add your first product',
            points: 25,
            isOptional: false,
            order: 1,
            status: 'not_started'
          },
          {
            id: 2,
            missionId: 1,
            eventId: 2,
            name: 'Add a Store Logo',
            description: 'Add your store logo',
            points: 25,
            isOptional: false,
            order: 2,
            status: 'not_started'
          }
        ]
      });
      
      // Execute the method
      const result = await eventProcessorService.processEvent(payload);
      
      // Assertions
      expect(result).toEqual({
        tasks_completed: ['1'],
        missions_completed: []
      });
      
      // Verify that task progress was updated
      expect(TaskRepository.prototype.updateProgress).toHaveBeenCalledWith(
        123, 1, 'completed'
      );
    });
    
    it('should handle case when event is not found', async () => {
      // Mock event payload
      const payload: EventPayload = {
        event: 'Unknown Event',
        store_id: 123,
        timestamp: new Date().toISOString()
      };
      
      // Mock event repository - event not found
      (EventRepository.prototype.findByName as jest.Mock).mockResolvedValue(null);
      
      // Expect it to throw an error
      await expect(eventProcessorService.processEvent(payload))
        .rejects
        .toThrow('Event "Unknown Event" is not registered in the system');
    });
    
    it('should not update already completed tasks', async () => {
      // Mock event payload
      const payload: EventPayload = {
        event: 'Product Added',
        store_id: 123,
        timestamp: new Date().toISOString()
      };
      
      // Mock event repository
      (EventRepository.prototype.findByName as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Product Added',
        description: 'Product was added to store'
      });
      
      // Mock tasks related to the event
      (TaskRepository.prototype.findByEventId as jest.Mock).mockResolvedValue([
        {
          id: 1,
          missionId: 1,
          eventId: 1,
          name: 'Add a Product',
          description: 'Add your first product',
          points: 25,
          isOptional: false,
          order: 1
        }
      ]);
      
      // Mock task progress check (task is already completed)
      (TaskRepository.prototype.findByIdForStore as jest.Mock).mockResolvedValue({
        id: 1,
        missionId: 1,
        eventId: 1,
        name: 'Add a Product',
        description: 'Add your first product',
        points: 25,
        isOptional: false,
        order: 1,
        status: 'completed'
      });
      
      // Execute the method
      const result = await eventProcessorService.processEvent(payload);
      
      // Assertions
      expect(result).toEqual({
        tasks_completed: [],
        missions_completed: []
      });
      
      // Verify that task progress was NOT updated
      expect(TaskRepository.prototype.updateProgress).not.toHaveBeenCalled();
    });
    
    it('should mark mission as completed when all tasks are done', async () => {
      // Mock event payload
      const payload: EventPayload = {
        event: 'Product Added',
        store_id: 123,
        timestamp: new Date().toISOString()
      };
      
      // Mock event repository
      (EventRepository.prototype.findByName as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Product Added',
        description: 'Product was added to store'
      });
      
      // Mock tasks related to the event
      (TaskRepository.prototype.findByEventId as jest.Mock).mockResolvedValue([
        {
          id: 1,
          missionId: 1,
          eventId: 1,
          name: 'Add a Product',
          description: 'Add your first product',
          points: 25,
          isOptional: false,
          order: 1
        }
      ]);
      
      // Mock task progress check (task not completed yet)
      (TaskRepository.prototype.findByIdForStore as jest.Mock).mockResolvedValue({
        id: 1,
        missionId: 1,
        eventId: 1,
        name: 'Add a Product',
        description: 'Add your first product',
        points: 25,
        isOptional: false,
        order: 1,
        status: 'not_started'
      });
      
      // Mock mission details - all other tasks already completed
      (MissionRepository.prototype.findByIdForStore as jest.Mock).mockResolvedValue({
        id: 1,
        name: 'Store Setup',
        description: 'Set up your store',
        pointsRequired: 50,
        isActive: true,
        targetType: 'all',
        tasks: [
          {
            id: 1,
            missionId: 1,
            eventId: 1,
            name: 'Add a Product',
            description: 'Add your first product',
            points: 25,
            isOptional: false,
            order: 1,
            status: 'not_started' // Will be marked completed by the event
          },
          {
            id: 2,
            missionId: 1,
            eventId: 2,
            name: 'Add a Store Logo',
            description: 'Add your store logo',
            points: 25,
            isOptional: false,
            order: 2,
            status: 'completed' // Already completed
          }
        ]
      });
      
      // Execute the method
      const result = await eventProcessorService.processEvent(payload);
      
      // Assertions
      expect(result).toEqual({
        tasks_completed: ['1'],
        missions_completed: ['1']
      });
    });
  });
});