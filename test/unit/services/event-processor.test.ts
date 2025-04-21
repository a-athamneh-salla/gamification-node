import { EventProcessor } from '../../../src/services/event-processor';
import { EventRepository } from '../../../src/repositories/event-repository';
import { TaskRepository } from '../../../src/repositories/task-repository';
import { MissionRepository } from '../../../src/repositories/mission-repository';
import { PlayerRepository } from '../../../src/repositories/player-repository';
import { RewardService } from '../../../src/services/reward-service';
import { LeaderboardService } from '../../../src/services/leaderboard-service';

// Define SallaEvent interface that matches what's used in event-processor.ts
interface SallaEvent {
  storeId: number;
  type: string;
  properties: Record<string, any>;
  timestamp: string;
}

// Mock repositories
jest.mock('../../../src/repositories/event-repository');
jest.mock('../../../src/repositories/task-repository');
jest.mock('../../../src/repositories/mission-repository');
jest.mock('../../../src/repositories/player-repository');
jest.mock('../../../src/services/reward-service');
jest.mock('../../../src/services/leaderboard-service');

describe('EventProcessor', () => {
  let eventProcessor: EventProcessor;
  let mockEventRepo: jest.Mocked<EventRepository>;
  let mockTaskRepo: jest.Mocked<TaskRepository>;
  let mockMissionRepo: jest.Mocked<MissionRepository>;
  let mockPlayerRepo: jest.Mocked<PlayerRepository>;
  let mockRewardService: jest.Mocked<RewardService>;
  let mockLeaderboardService: jest.Mocked<LeaderboardService>;
  let mockDB: any;

  beforeEach(() => {
    // Create mock DB
    mockDB = {};
    
    // Create mocked repositories
    mockEventRepo = new EventRepository(mockDB) as jest.Mocked<EventRepository>;
    mockTaskRepo = new TaskRepository(mockDB) as jest.Mocked<TaskRepository>;
    mockMissionRepo = new MissionRepository(mockDB) as jest.Mocked<MissionRepository>;
    mockPlayerRepo = new PlayerRepository(mockDB) as jest.Mocked<PlayerRepository>;
    mockRewardService = new RewardService(mockDB) as jest.Mocked<RewardService>;
    mockLeaderboardService = new LeaderboardService(mockDB) as jest.Mocked<LeaderboardService>;
    
    // Create event processor with new constructor signature
    eventProcessor = new EventProcessor(
      mockEventRepo,
      mockTaskRepo,
      mockMissionRepo,
      mockPlayerRepo,
      mockRewardService,
      mockLeaderboardService
    );
  });

  describe('processEvent', () => {
    it('should process an event and update tasks', async () => {
      // Arrange
      const event: SallaEvent = {
        storeId: 123,
        type: 'order_create',
        properties: {
          order_id: '12345',
          total: 100
        },
        timestamp: '2023-01-01T12:00:00Z'
      };
      
      // Mock getting or creating player
      mockPlayerRepo.getOrCreatePlayer.mockResolvedValue({
        id: 1,
        externalId: '123',
        name: 'Test Player',
        points: 0,
        totalPoints: 0,
        tasksCompleted: 0,
        missionsCompleted: 0,
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z'
      });

      // Mock finding tasks for event - use the correct method name
      mockTaskRepo.findByEventType.mockResolvedValue([
        {
          id: 1,
          missionId: 1,
          eventId: 'order_create',
          name: 'Create your first order',
          description: 'Create your first order in the store',
          points: 10,
          isOptional: false, 
          isActive: true,
          requiredProgress: 1,
          order: 1,
          createdAt: '2023-01-01T12:00:00Z',
          updatedAt: '2023-01-01T12:00:00Z'
        }
      ]);
      
      // Mock task repository update progress
      mockTaskRepo.updateProgress.mockResolvedValue({
        id: 1,
        missionId: 1,
        eventId: 'order_create',
        name: 'Create your first order',
        description: 'Create your first order in the store',
        points: 10,
        isOptional: false,
        isActive: true,
        requiredProgress: 1,
        order: 1,
        status: 'completed',
        completedAt: '2023-01-01T12:00:00Z',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z'
      });
      
      // Mock mission methods
      mockTaskRepo.findByMission.mockResolvedValue([
        {
          id: 1,
          missionId: 1,
          eventId: 'order_create',
          name: 'Create your first order',
          description: 'Create your first order in the store',
          points: 10,
          isOptional: false,
          isActive: true,
          requiredProgress: 1,
          order: 1,
          createdAt: '2023-01-01T12:00:00Z',
          updatedAt: '2023-01-01T12:00:00Z'
        }
      ]);
      
      mockTaskRepo.findAllCompletedTasksByMission.mockResolvedValue([
        {
          id: 1,
          missionId: 1,
          eventId: 'order_create',
          name: 'Create your first order',
          description: 'Create your first order in the store',
          points: 10,
          isOptional: false,
          isActive: true,
          requiredProgress: 1,
          order: 1,
          status: 'completed',
          completedAt: '2023-01-01T12:00:00Z',
          createdAt: '2023-01-01T12:00:00Z',
          updatedAt: '2023-01-01T12:00:00Z'
        }
      ]);
      
      mockMissionRepo.updateProgress.mockResolvedValue({
        id: 1,
        gameId: 1,
        name: 'Getting Started',
        description: 'Complete initial store setup',
        pointsRequired: 10,
        isActive: true,
        isRecurring: false,
        targetType: 'all',
        status: 'completed',
        progress: 100,
        completedAt: '2023-01-01T12:00:00Z',
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-01T12:00:00Z',
        affectsLeaderboard: true,
        leaderboardPoints: 50
      });
      
      mockRewardService.grantRewardsForMission.mockResolvedValue([]);
      
      mockEventRepo.logEvent.mockResolvedValue({});

      // Act
      const result = await eventProcessor.processEvent(event);

      // Assert
      expect(mockPlayerRepo.getOrCreatePlayer).toHaveBeenCalledWith(123);
      expect(mockTaskRepo.findByEventType).toHaveBeenCalledWith('order_create');
      expect(mockTaskRepo.updateProgress).toHaveBeenCalledWith(
        1,
        1,
        'completed'
      );
      expect(result.success).toBe(true);
    });
  });
});