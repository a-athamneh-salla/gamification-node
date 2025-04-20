"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionService = void 0;
const mission_repository_1 = require("../repositories/mission-repository");
/**
 * Mission Service
 * Handles business logic for missions
 */
class MissionService {
    constructor(db) {
        this.missionRepository = new mission_repository_1.MissionRepository(db);
    }
    /**
     * Get missions available for a store with filters and pagination
     * @param storeId Store ID
     * @param status Filter by mission status
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Object with missions array and total count
     */
    async getMissionsByStore(storeId, status = 'all', page = 1, limit = 10) {
        return this.missionRepository.findByStore(storeId, status, page, limit);
    }
    /**
     * Get detailed mission information by ID for a specific store
     * @param storeId Store ID
     * @param missionId Mission ID
     * @returns Mission with tasks and progress information or null if not found
     */
    async getMissionById(storeId, missionId) {
        const mission = await this.missionRepository.findByIdForStore(storeId, missionId);
        if (!mission) {
            return null;
        }
        // Ensure tasks are ordered correctly
        mission.tasks = mission.tasks.sort((a, b) => a.order - b.order);
        return mission;
    }
    /**
     * Get mission with tasks and progress for a store
     * @param storeId Store ID
     * @param missionId Mission ID
     * @returns Detailed mission information with tasks and progress
     */
    async getMissionWithTasksAndProgress(storeId, missionId) {
        return this.getMissionById(storeId, missionId);
    }
    /**
     * Get tasks associated with a mission for a store
     * @param storeId Store ID
     * @param missionId Mission ID
     * @returns Array of tasks with progress information
     */
    async getMissionTasks(storeId, missionId) {
        const mission = await this.getMissionById(storeId, missionId);
        if (!mission) {
            return [];
        }
        return mission.tasks || [];
    }
    /**
     * Get rewards associated with a mission for a store
     * @param storeId Store ID
     * @param missionId Mission ID
     * @returns Array of rewards with status information
     */
    async getMissionRewards(storeId, missionId) {
        const mission = await this.getMissionById(storeId, missionId);
        if (!mission) {
            return [];
        }
        return mission.rewards || [];
    }
    /**
     * Check if a mission is available to a specific store
     * @param storeId Store ID
     * @param missionId Mission ID
     * @returns Boolean indicating if mission is available
     */
    async isMissionAvailableToStore(storeId, missionId) {
        const mission = await this.missionRepository.findById(missionId);
        if (!mission) {
            return false;
        }
        // Check if mission is active
        if (!mission.isActive) {
            return false;
        }
        // Check if mission is within time bounds
        const now = new Date().getTime();
        if (mission.startDate && new Date(mission.startDate).getTime() > now) {
            return false;
        }
        if (mission.endDate && new Date(mission.endDate).getTime() < now) {
            return false;
        }
        // Check if mission targets this store
        if (mission.targetType === 'all') {
            return true;
        }
        if (mission.targetType === 'specific' && mission.targetStores) {
            try {
                const targetStores = JSON.parse(mission.targetStores);
                if (Array.isArray(targetStores) && targetStores.includes(storeId)) {
                    return true;
                }
            }
            catch (e) {
                console.error('Error parsing targetStores:', e);
                return false;
            }
        }
        if (mission.targetType === 'filtered' && mission.targetStores) {
            try {
                // Here you would apply filter logic based on store attributes
                // This is a placeholder - actual implementation would depend on your filtering requirements
                return true;
            }
            catch (e) {
                console.error('Error parsing targetStores filter:', e);
                return false;
            }
        }
        return false;
    }
    /**
     * Check if prerequisites for a mission are completed for a store
     * @param storeId Store ID
     * @param missionId Mission ID
     * @returns Boolean indicating if prerequisites are met
     */
    async areMissionPrerequisitesMet(storeId, missionId) {
        const mission = await this.missionRepository.findById(missionId);
        if (!mission || !mission.prerequisiteMissionId) {
            // No prerequisites or mission doesn't exist
            return true;
        }
        const prerequisiteMission = await this.missionRepository.findByIdForStore(storeId, mission.prerequisiteMissionId);
        // Check if prerequisite mission is completed
        return prerequisiteMission?.status === 'completed';
    }
    /**
     * Calculate mission progress for a store
     * @param storeId Store ID
     * @param missionId Mission ID
     * @returns Progress information
     */
    async calculateMissionProgress(storeId, missionId) {
        const mission = await this.missionRepository.findByIdForStore(storeId, missionId);
        if (!mission) {
            throw new Error(`Mission ${missionId} not found`);
        }
        const tasks = mission.tasks || [];
        const completedTasks = tasks.filter((t) => t.status === 'completed').length;
        const totalTasks = tasks.length;
        const totalPoints = tasks.reduce((sum, task) => sum + task.points, 0);
        const pointsEarned = tasks.reduce((sum, task) => {
            return task.status === 'completed' ? sum + task.points : sum;
        }, 0);
        // Calculate progress percentage
        const progressPercentage = totalPoints > 0
            ? Math.round((pointsEarned / totalPoints) * 100)
            : 0;
        // Determine mission status
        let status = 'not_started';
        if (pointsEarned >= mission.pointsRequired) {
            status = 'completed';
        }
        else if (pointsEarned > 0) {
            status = 'in_progress';
        }
        return {
            status,
            pointsEarned,
            totalPoints,
            progressPercentage,
            completedTasks,
            totalTasks
        };
    }
}
exports.MissionService = MissionService;
