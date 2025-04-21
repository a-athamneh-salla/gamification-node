"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
/**
 * Task Service
 * Handles business logic for tasks
 */
class TaskService {
    constructor(taskRepository, missionRepository, playerRepository) {
        this.taskRepository = taskRepository;
        this.missionRepository = missionRepository;
        this.playerRepository = playerRepository;
    }
    /**
     * Get tasks for a mission with filters and pagination
     * @param playerId Player ID
     * @param missionId Mission ID
     * @param status Optional filter by status
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object with tasks array and total count
     */
    async getTasksForMission(playerId, missionId, status = 'all', page = 1, limit = 10) {
        return this.taskRepository.findByPlayerAndMission(playerId, missionId, status, page, limit);
    }
    /**
     * Get task by ID for a specific player
     * @param playerId Player ID
     * @param taskId Task ID
     * @returns Task or null if not found
     */
    async getTaskById(playerId, taskId) {
        return this.taskRepository.findByIdForPlayer(playerId, taskId);
    }
    /**
     * Mark a task as complete for a specific player
     * @param playerId The player ID
     * @param taskId The task ID to complete
     * @returns The result of the task operation
     */
    async completeTask(playerId, taskId) {
        try {
            const task = await this.taskRepository.findByIdForPlayer(playerId, taskId);
            if (!task) {
                return {
                    success: false,
                    message: `Task ${taskId} not found`,
                    taskId,
                    taskStatus: 'not_started'
                };
            }
            const updatedTask = await this.taskRepository.updateProgress(playerId, taskId, 'completed');
            if (!updatedTask) {
                throw new Error(`Failed to update task ${taskId}`);
            }
            return {
                success: true,
                message: 'Task completed successfully',
                taskId: task.id,
                taskStatus: 'completed',
                data: {
                    task: updatedTask,
                    pointsEarned: task.points
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            return {
                success: false,
                message: `Error completing task: ${errorMessage}`,
                taskId,
                taskStatus: 'not_started'
            };
        }
    }
    /**
     * Skip an optional task
     * @param playerId Player ID
     * @param taskId Task ID
     * @returns Object with status and updated task
     */
    async skipTask(playerId, taskId) {
        try {
            const task = await this.taskRepository.findByIdForPlayer(playerId, taskId);
            if (!task) {
                return {
                    success: false,
                    message: `Task with ID ${taskId} not found`
                };
            }
            // Check if task is already completed
            if (task.status === 'completed') {
                return {
                    success: false,
                    message: 'Task is already completed and cannot be skipped'
                };
            }
            // Check if task is already skipped
            if (task.status === 'skipped') {
                return {
                    success: false,
                    message: 'Task is already skipped'
                };
            }
            // Check if task can be skipped
            if (!task.isOptional) {
                const taskDetails = await this.taskRepository.getTaskWithEvent(taskId);
                return {
                    success: false,
                    message: `Task "${taskDetails.name}" is required and cannot be skipped`
                };
            }
            await this.taskRepository.updateProgress(playerId, taskId, 'skipped');
            return {
                success: true,
                message: 'Task skipped successfully'
            };
        }
        catch (error) {
            console.error('Error skipping task:', error);
            return {
                success: false,
                message: error.message || 'Failed to skip task'
            };
        }
    }
    /**
     * Get all tasks for a mission with progress
     * @param playerId Player ID
     * @param missionId Mission ID
     * @returns Array of tasks with progress
     */
    async getAllTasksForMission(playerId, missionId) {
        return (await this.taskRepository.findByPlayerAndMission(playerId, missionId)).tasks;
    }
    /**
     * Find tasks by player
     * @param playerId Player ID
     * @param page Page number
     * @param limit Items per page
     * @returns Object with tasks array and total count
     */
    async findByPlayer(playerId, page = 1, limit = 10) {
        return await this.taskRepository.findByPlayer(playerId, page, limit);
    }
    /**
     * Find tasks by player and mission
     * @param playerId Player ID
     * @param missionId Mission ID
     * @param status Optional filter by status
     * @param page Page number
     * @param limit Items per page
     * @returns Object with tasks array and total count
     */
    async findByPlayerAndMission(playerId, missionId, status = 'all', page = 1, limit = 10) {
        return await this.taskRepository.findByPlayerAndMission(playerId, missionId, status, page, limit);
    }
    /**
     * Get task details with player progress
     * @param playerId Player ID
     * @param taskId Task ID
     * @returns Task with progress or null if not found
     */
    async getTaskDetails(playerId, taskId) {
        const task = await this.taskRepository.findByPlayerAndTaskId(playerId, taskId);
        return task;
    }
    /**
     * Update task progress
     * @param playerId Player ID
     * @param taskId Task ID
     * @param status New status
     * @returns Updated task
     */
    async updateProgress(playerId, taskId, status) {
        const task = await this.taskRepository.findById(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }
        // Update task status
        const updatedTask = await this.taskRepository.updateProgress(playerId, taskId, status);
        if (!updatedTask) {
            throw new Error(`Failed to update task ${taskId}`);
        }
        // If task was completed, update player points
        if (status === 'completed') {
            await this.playerRepository.addPoints(playerId, task.points);
        }
        // Check if mission is completed
        await this.checkMissionCompletion(playerId, task.missionId);
        return updatedTask;
    }
    /**
     * Check mission completion status
     * @param playerId Player ID
     * @param mission Mission object
     * @returns Completion information
     */
    async checkMissionCompletion(playerId, missionId) {
        try {
            const mission = await this.missionRepository.findByIdForPlayer(playerId, missionId);
            if (!mission) {
                throw new Error(`Mission ${missionId} not found`);
            }
            // Get all tasks for this mission with their status
            const { tasks } = await this.taskRepository.findByPlayerAndMission(playerId, mission.id);
            // Calculate total points and earned points
            const totalTaskPoints = tasks.reduce((sum, t) => sum + (t.points || 0), 0);
            const completedTaskPoints = tasks.reduce((sum, t) => t.status === 'completed' ? sum + (t.points || 0) : sum, 0);
            // Calculate progress
            const requiredPoints = mission.pointsRequired || 0;
            const earnedPoints = completedTaskPoints;
            const progress = requiredPoints > 0
                ? Math.min(100, Math.round((earnedPoints / requiredPoints) * 100))
                : 0;
            // Count completed tasks
            const tasksCompleted = tasks.filter(t => t.status === 'completed').length;
            const totalTasks = tasks.length;
            // If all required tasks are completed and points requirement is met,
            // update mission status
            const allRequiredCompleted = tasks
                .filter(t => t.status === 'not_started' && !t.isOptional)
                .length === 0;
            if (allRequiredCompleted && earnedPoints >= requiredPoints) {
                await this.missionRepository.updateProgress(playerId, missionId, 'completed', earnedPoints);
            }
            return {
                isCompleted: progress >= 100,
                progress,
                totalPoints: totalTaskPoints,
                earnedPoints,
                requiredPoints,
                tasksCompleted,
                totalTasks
            };
        }
        catch (error) {
            console.error('Error checking mission completion:', error);
            return {
                isCompleted: false,
                progress: 0,
                totalPoints: 0,
                earnedPoints: 0,
                requiredPoints: 0,
                tasksCompleted: 0,
                totalTasks: 0
            };
        }
    }
}
exports.TaskService = TaskService;
