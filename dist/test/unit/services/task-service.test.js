"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_repository_1 = require("../../../src/repositories/task-repository");
const mission_repository_1 = require("../../../src/repositories/mission-repository");
const task_service_1 = require("../../../src/services/task-service");
const player_repository_1 = require("../../../src/repositories/player-repository");
jest.mock('../../../src/repositories/task-repository');
jest.mock('../../../src/repositories/mission-repository');
jest.mock('../../../src/repositories/player-repository');
describe('TaskService', () => {
    let taskService;
    let mockTaskRepo;
    let mockMissionRepo;
    let mockPlayerRepo;
    beforeEach(() => {
        // Create mock repositories
        mockTaskRepo = new task_repository_1.TaskRepository({});
        mockMissionRepo = new mission_repository_1.MissionRepository({});
        mockPlayerRepo = new player_repository_1.PlayerRepository({});
        // Create task service with the correct constructor parameters
        taskService = new task_service_1.TaskService(mockTaskRepo, mockMissionRepo, mockPlayerRepo);
    });
    describe('skipTask', () => {
        it('should skip an optional task successfully', async () => {
            // Mock task with progress (optional task that can be skipped)
            mockTaskRepo.findByIdForPlayer.mockResolvedValue({
                id: 1,
                missionId: 1,
                eventId: "subscribe-newsletter",
                name: 'Subscribe to Newsletter',
                description: 'Subscribe to marketing newsletter',
                points: 10,
                isOptional: true,
                isActive: true,
                requiredProgress: 1,
                order: 3,
                status: 'not_started'
            });
            // Mock mission data with tasks
            mockMissionRepo.findByIdForPlayer.mockResolvedValue({
                id: 1,
                name: 'Marketing Setup',
                description: 'Set up your marketing',
                pointsRequired: 30,
                isActive: true,
                targetType: 'all',
                gameId: 1,
                tasks: [
                    {
                        id: 1,
                        missionId: 1,
                        eventId: "subscribe-newsletter",
                        name: 'Subscribe to Newsletter',
                        description: 'Subscribe to marketing newsletter',
                        points: 10,
                        isOptional: true,
                        isActive: true,
                        requiredProgress: 1,
                        order: 3,
                        status: 'not_started',
                        completedAt: undefined,
                        createdAt: '2023-01-01T00:00:00Z',
                        updatedAt: '2023-01-01T00:00:00Z'
                    },
                    {
                        id: 2,
                        missionId: 1,
                        eventId: "create-discount",
                        name: 'Create Discount Code',
                        description: 'Create your first discount code',
                        points: 20,
                        isOptional: false,
                        isActive: true,
                        requiredProgress: 1,
                        order: 1,
                        status: 'completed',
                        completedAt: undefined,
                        createdAt: '2023-01-01T00:00:00Z',
                        updatedAt: '2023-01-01T00:00:00Z'
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
            expect(mockTaskRepo.updateProgress).toHaveBeenCalledWith(1, 123, 'skipped');
        });
        it('should not allow skipping a required task', async () => {
            // Mock task with progress (required task that cannot be skipped)
            mockTaskRepo.findByIdForPlayer.mockResolvedValue({
                id: 2,
                missionId: 1,
                eventId: "create-discount",
                name: 'Create Discount Code',
                description: 'Create your first discount code',
                points: 20,
                isOptional: false,
                isActive: true,
                requiredProgress: 1,
                order: 1,
                status: 'not_started'
            });
            // Mock getting task with event details
            mockTaskRepo.getTaskWithEvent.mockResolvedValue({
                id: 2,
                missionId: 1,
                eventId: "create-discount",
                name: 'Create Discount Code',
                description: 'Create your first discount code',
                points: 20,
                isOptional: false,
                isActive: true,
                requiredProgress: 1,
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
            expect(mockTaskRepo.updateProgress).not.toHaveBeenCalled();
        });
        it('should not allow skipping an already completed task', async () => {
            // Mock task with progress (already completed)
            mockTaskRepo.findByIdForPlayer.mockResolvedValue({
                id: 2,
                missionId: 1,
                eventId: "create-discount",
                name: 'Create Discount Code',
                description: 'Create your first discount code',
                points: 20,
                isOptional: true, // even optional tasks can't be skipped if already completed
                isActive: true,
                requiredProgress: 1,
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
            expect(mockTaskRepo.updateProgress).not.toHaveBeenCalled();
        });
        it('should not allow skipping an already skipped task', async () => {
            // Mock task with progress (already skipped)
            mockTaskRepo.findByIdForPlayer.mockResolvedValue({
                id: 1,
                missionId: 1,
                eventId: "subscribe-newsletter",
                name: 'Subscribe to Newsletter',
                description: 'Subscribe to marketing newsletter',
                points: 10,
                isOptional: true,
                isActive: true,
                requiredProgress: 1,
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
            expect(mockTaskRepo.updateProgress).not.toHaveBeenCalled();
        });
        it('should handle task not found case', async () => {
            // Mock task not found
            mockTaskRepo.findByIdForPlayer.mockResolvedValue(null);
            // Execute skip task
            const result = await taskService.skipTask(123, 999);
            // Assertions
            expect(result).toEqual({
                success: false,
                message: 'Task with ID 999 not found'
            });
            // Verify task status was NOT updated
            expect(mockTaskRepo.updateProgress).not.toHaveBeenCalled();
        });
    });
    describe('getTasksForMission', () => {
        it('should return tasks for a mission sorted by order', async () => {
            // Using TaskStatus enum for the status values
            const mockTasks = {
                tasks: [
                    {
                        id: 3,
                        missionId: 1,
                        eventId: "send-email",
                        name: 'Send Marketing Email',
                        description: 'Send your first marketing email',
                        points: 15,
                        isOptional: false,
                        isActive: true,
                        requiredProgress: 1,
                        order: 2,
                        status: 'not_started',
                        completedAt: undefined,
                        createdAt: '2023-01-01T00:00:00Z',
                        updatedAt: '2023-01-01T00:00:00Z'
                    },
                    {
                        id: 2,
                        missionId: 1,
                        eventId: "create-discount",
                        name: 'Create Discount Code',
                        description: 'Create your first discount code',
                        points: 20,
                        isOptional: false,
                        isActive: true,
                        requiredProgress: 1,
                        order: 1,
                        status: 'completed',
                        completedAt: undefined,
                        createdAt: '2023-01-01T00:00:00Z',
                        updatedAt: '2023-01-01T00:00:00Z'
                    },
                    {
                        id: 1,
                        missionId: 1,
                        eventId: "subscribe-newsletter",
                        name: 'Subscribe to Newsletter',
                        description: 'Subscribe to marketing newsletter',
                        points: 10,
                        isOptional: true,
                        isActive: true,
                        requiredProgress: 1,
                        order: 3,
                        status: 'not_started',
                        completedAt: undefined,
                        createdAt: '2023-01-01T00:00:00Z',
                        updatedAt: '2023-01-01T00:00:00Z'
                    }
                ],
                total: 3
            };
            mockTaskRepo.findByPlayerAndMission.mockResolvedValue(mockTasks);
            // Execute get tasks
            const result = await taskService.getAllTasksForMission(123, 1);
            expect(result).toBeDefined();
            expect(result.length).toBe(3);
            // Tasks should be sorted by order
            expect(result[0].id).toBe(2); // order: 1
            expect(result[1].id).toBe(3); // order: 2
            expect(result[2].id).toBe(1); // order: 3
        });
    });
    describe('completeTask', () => {
        beforeEach(() => {
            mockTaskRepo.findByIdForPlayer.mockResolvedValue({
                id: 1,
                missionId: 101,
                eventId: 'event_123',
                name: 'Test Task',
                description: 'Description',
                points: 10,
                isOptional: true,
                isActive: true,
                requiredProgress: 1,
                order: 1,
                status: 'not_started',
                completedAt: undefined,
                createdAt: '2023-01-01T00:00:00Z',
                updatedAt: '2023-01-01T00:00:00Z'
            });
            // Use the correct parameter order (taskId, playerId, status) and don't reference unused parameters
            mockTaskRepo.updateProgress.mockImplementation((taskId, _playerId, status) => {
                return Promise.resolve({
                    id: taskId,
                    status,
                    missionId: 101,
                    points: 10,
                    name: 'Test Task',
                    isOptional: true,
                    isActive: true,
                    requiredProgress: 1,
                    order: 1,
                    completedAt: undefined,
                    createdAt: '2023-01-01T00:00:00Z',
                    updatedAt: '2023-01-01T00:00:00Z'
                });
            });
        });
        it('should complete a task successfully', async () => {
            const result = await taskService.completeTask(123, 1);
            expect(result.success).toBe(true);
            expect(result.message).toBe('Task completed successfully');
            expect(mockTaskRepo.updateProgress).toHaveBeenCalledWith(1, 123, 'completed');
        });
        it('should not complete an already completed task', async () => {
            mockTaskRepo.findByIdForPlayer.mockResolvedValue({
                id: 1,
                missionId: 101,
                eventId: 'event_123',
                name: 'Test Task',
                description: 'Description',
                points: 10,
                isOptional: true,
                isActive: true,
                requiredProgress: 1,
                order: 1,
                status: 'completed',
                completedAt: undefined,
                createdAt: '2023-01-01T00:00:00Z',
                updatedAt: '2023-01-01T00:00:00Z'
            });
            const result = await taskService.completeTask(123, 1);
            expect(result.success).toBe(false);
            expect(result.message).toBe('Task is already completed');
            expect(mockTaskRepo.updateProgress).not.toHaveBeenCalled();
        });
    });
});
