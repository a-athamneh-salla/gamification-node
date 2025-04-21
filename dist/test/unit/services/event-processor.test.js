"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_processor_1 = require("../../../src/services/event-processor");
const event_repository_1 = require("../../../src/repositories/event-repository");
const task_repository_1 = require("../../../src/repositories/task-repository");
const mission_repository_1 = require("../../../src/repositories/mission-repository");
const player_repository_1 = require("../../../src/repositories/player-repository");
const reward_service_1 = require("../../../src/services/reward-service");
const leaderboard_service_1 = require("../../../src/services/leaderboard-service");
// Mock repositories
jest.mock('../../../src/repositories/event-repository');
jest.mock('../../../src/repositories/task-repository');
jest.mock('../../../src/repositories/mission-repository');
jest.mock('../../../src/repositories/player-repository');
jest.mock('../../../src/services/reward-service');
jest.mock('../../../src/services/leaderboard-service');
describe('EventProcessor', () => {
    let eventProcessor;
    let mockEventRepo;
    let mockTaskRepo;
    let mockMissionRepo;
    let mockPlayerRepo;
    let mockRewardService;
    let mockLeaderboardService;
    let mockDB;
    beforeEach(() => {
        // Create mock DB
        mockDB = {};
        // Create mocked repositories
        mockEventRepo = new event_repository_1.EventRepository(mockDB);
        mockTaskRepo = new task_repository_1.TaskRepository(mockDB);
        mockMissionRepo = new mission_repository_1.MissionRepository(mockDB);
        mockPlayerRepo = new player_repository_1.PlayerRepository(mockDB);
        mockRewardService = new reward_service_1.RewardService(mockDB);
        mockLeaderboardService = new leaderboard_service_1.LeaderboardService(mockDB);
        // Create event processor with new constructor signature
        eventProcessor = new event_processor_1.EventProcessor(mockEventRepo, mockTaskRepo, mockMissionRepo, mockPlayerRepo, mockRewardService, mockLeaderboardService);
    });
    describe('processEvent', () => {
        it('should process an event and update tasks', async () => {
            // Arrange
            const event = {
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
            expect(mockTaskRepo.updateProgress).toHaveBeenCalledWith(1, 1, 'completed');
            expect(result.success).toBe(true);
        });
    });
});
