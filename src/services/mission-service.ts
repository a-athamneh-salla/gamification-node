import { DB } from '../db';
import { MissionRepository } from '../repositories/mission-repository';
import { MissionStatus, MissionWithTasks } from '../types';

/**
 * Mission Service
 * Handles business logic for missions
 */
export class MissionService {
  private missionRepository: MissionRepository;

  constructor(db: DB) {
    this.missionRepository = new MissionRepository(db);
  }

  /**
   * Get missions available for a store with filters and pagination
   * @param storeId Store ID
   * @param status Filter by mission status
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object with missions array and total count
   */
  async getMissionsByStore(
    storeId: number,
    status: MissionStatus | 'all' = 'all',
    page: number = 1,
    limit: number = 10
  ): Promise<{ missions: MissionWithTasks[]; total: number }> {
    return this.missionRepository.findByStore(storeId, status, page, limit);
  }

  /**
   * Get detailed mission information by ID for a specific store
   * @param storeId Store ID
   * @param missionId Mission ID
   * @returns Mission with tasks and progress information or null if not found
   */
  async getMissionById(storeId: number, missionId: number): Promise<MissionWithTasks | null> {
    const mission = await this.missionRepository.findByIdForStore(storeId, missionId);
    
    if (!mission) {
      return null;
    }
    
    // Ensure tasks are ordered correctly
    mission.tasks = mission.tasks.sort((a: any, b: any) => a.order - b.order);
    
    return mission;
  }

  /**
   * Get mission with tasks and progress for a store
   * @param storeId Store ID
   * @param missionId Mission ID
   * @returns Detailed mission information with tasks and progress
   */
  async getMissionWithTasksAndProgress(storeId: number, missionId: number): Promise<MissionWithTasks | null> {
    return this.getMissionById(storeId, missionId);
  }

  /**
   * Get tasks associated with a mission for a store
   * @param storeId Store ID
   * @param missionId Mission ID
   * @returns Array of tasks with progress information
   */
  async getMissionTasks(storeId: number, missionId: number): Promise<any[]> {
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
  async getMissionRewards(storeId: number, missionId: number): Promise<any[]> {
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
  async isMissionAvailableToStore(storeId: number, missionId: number): Promise<boolean> {
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
      } catch (e) {
        console.error('Error parsing targetStores:', e);
        return false;
      }
    }
    
    if (mission.targetType === 'filtered' && mission.targetStores) {
      try {
        // Here you would apply filter logic based on store attributes
        // This is a placeholder - actual implementation would depend on your filtering requirements
        return true;
      } catch (e) {
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
  async areMissionPrerequisitesMet(storeId: number, missionId: number): Promise<boolean> {
    const mission = await this.missionRepository.findById(missionId);
    
    if (!mission || !mission.prerequisiteMissionId) {
      // No prerequisites or mission doesn't exist
      return true;
    }
    
    const prerequisiteMission = await this.missionRepository.findByIdForStore(
      storeId,
      mission.prerequisiteMissionId
    );
    
    // Check if prerequisite mission is completed
    return prerequisiteMission?.status === 'completed';
  }

  /**
   * Calculate mission progress for a store
   * @param storeId Store ID
   * @param missionId Mission ID
   * @returns Progress information
   */
  async calculateMissionProgress(storeId: number, missionId: number): Promise<{
    status: MissionStatus;
    pointsEarned: number;
    totalPoints: number;
    progressPercentage: number;
    completedTasks: number;
    totalTasks: number;
  }> {
    const mission = await this.missionRepository.findByIdForStore(storeId, missionId);
    
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }
    
    const tasks = mission.tasks || [];
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const totalPoints = tasks.reduce((sum: number, task: any) => sum + task.points, 0);
    const pointsEarned = tasks.reduce((sum: number, task: any) => {
      return task.status === 'completed' ? sum + task.points : sum;
    }, 0);
    
    // Calculate progress percentage
    const progressPercentage = totalPoints > 0
      ? Math.round((pointsEarned / totalPoints) * 100)
      : 0;
    
    // Determine mission status
    let status: MissionStatus = 'not_started';
    if (pointsEarned >= mission.pointsRequired) {
      status = 'completed';
    } else if (pointsEarned > 0) {
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