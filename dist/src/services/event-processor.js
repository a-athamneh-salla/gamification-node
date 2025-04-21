"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventProcessor = void 0;
/**
 * Service for processing incoming events and updating tasks
 */
class EventProcessor {
    constructor(eventRepo, taskRepo, missionRepo, playerRepo, rewardService, leaderboardService) {
        this.eventRepo = eventRepo;
        this.taskRepo = taskRepo;
        this.missionRepo = missionRepo;
        this.playerRepo = playerRepo;
        this.rewardService = rewardService;
        this.leaderboardService = leaderboardService;
    }
    /**
     * Process an incoming event
     * @param event The event to process
     * @returns Processing result including tasks and missions updated
     */
    async processEvent(event) {
        try {
            // Normalize input to SallaEvent format
            const normalizedEvent = this.normalizeEvent(event);
            // Get or create player for this store
            const player = await this.playerRepo.getOrCreatePlayer(normalizedEvent.storeId);
            // Find tasks associated with this event type
            const tasks = await this.taskRepo.findByEventType(normalizedEvent.type);
            let tasksUpdated = 0;
            let missionsUpdated = 0;
            const taskUpdates = [];
            const missionUpdates = [];
            const rewardUpdates = [];
            const missionsAffected = new Set();
            // Process each task and update progress
            for (const task of tasks) {
                // Update task progress
                const updatedTask = await this.taskRepo.updateProgress(task.id, player.id, 'completed');
                if (updatedTask) {
                    tasksUpdated++;
                    taskUpdates.push({
                        success: true,
                        message: 'Task updated successfully',
                        taskId: task.id,
                        taskStatus: 'completed'
                    });
                    missionsAffected.add(task.missionId);
                    // Check if all tasks in the mission are completed
                    const allMissionTasks = await this.taskRepo.findByMission(task.missionId);
                    const completedTasks = await this.taskRepo.findAllCompletedTasksByMission(task.missionId, player.id);
                    // Update mission progress
                    const progress = Math.floor((completedTasks.length / allMissionTasks.length) * 100);
                    const isCompleted = progress === 100;
                    const status = isCompleted ? 'completed' : 'in_progress';
                    // Update mission progress
                    const updatedMission = await this.missionRepo.updateProgress(task.missionId, player.id, status, progress);
                    if (updatedMission) {
                        missionsUpdated++;
                        missionUpdates.push({
                            success: true,
                            message: `Mission ${isCompleted ? 'completed' : 'updated'} successfully`,
                            missionId: task.missionId,
                            missionStatus: status,
                            tasksCompleted: completedTasks.length,
                            tasksTotal: allMissionTasks.length
                        });
                        // If mission is completed, grant rewards
                        if (isCompleted) {
                            const rewards = await this.rewardService.grantRewardsForMission(task.missionId, player.id, normalizedEvent.game_id || player.id // Use game_id if available or fallback to player.id
                            );
                            // Update player's score on the leaderboard if the service is available
                            if (this.leaderboardService && updatedMission.affectsLeaderboard) {
                                const pointsToAdd = updatedMission.leaderboardPoints || 0;
                                await this.leaderboardService.updatePlayerScore(player.id, pointsToAdd);
                            }
                            // Add reward updates
                            rewards.forEach(reward => {
                                rewardUpdates.push({
                                    success: true,
                                    message: `Reward granted: ${reward.name}`,
                                    reward
                                });
                            });
                        }
                    }
                }
            }
            // Log event
            await this.eventRepo.logEvent({
                type: normalizedEvent.type,
                playerId: player.id,
                data: JSON.stringify(normalizedEvent.properties),
                timestamp: normalizedEvent.timestamp
            });
            return {
                success: true,
                message: `Event processed successfully: ${normalizedEvent.type}`,
                event: normalizedEvent.type,
                playerId: player.id,
                gameId: normalizedEvent.game_id,
                taskUpdates,
                missionUpdates,
                rewardUpdates
            };
        }
        catch (error) {
            console.error('Error processing event:', error);
            return {
                success: false,
                message: error.message || 'Error processing event',
                taskUpdates: [],
                missionUpdates: [],
                rewardUpdates: []
            };
        }
    }
    /**
     * Normalize input event to SallaEvent format
     */
    normalizeEvent(event) {
        if ('storeId' in event) {
            return event;
        }
        // Convert EventPayload to SallaEvent
        return {
            storeId: event.player_id,
            type: event.event,
            timestamp: new Date().toISOString(),
            properties: event.event_data || {},
            player_id: event.player_id,
            game_id: event.game_id,
            merchant: event.merchant
        };
    }
}
exports.EventProcessor = EventProcessor;
