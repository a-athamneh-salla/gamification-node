import { MissionRepository } from '../repositories/mission-repository';
import { Mission, MissionStatus } from '../types';

/**
 * Mission Service
 * Handles business logic for missions
 */
export class MissionService {
  private missionRepository: MissionRepository;

  constructor(missionRepository: MissionRepository) {
    this.missionRepository = missionRepository;
  }

  /**
   * Get missions by player with status filter and pagination
   * @param playerId Player ID
   * @param status Optional filter by status
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object with missions array and total count
   */
  async getPlayerMissions(
    playerId: number,
    status?: MissionStatus,
    page: number = 1,
    limit: number = 10
  ): Promise<{ missions: Mission[]; total: number }> {
    return this.missionRepository.findByPlayer(playerId, status, page, limit);
  }

  /**
   * Get mission by ID for a player
   * @param playerId Player ID
   * @param missionId Mission ID
   * @returns Mission with progress info or null
   */
  async getMissionById(playerId: number, missionId: number): Promise<Mission | null> {
    return this.missionRepository.findByIdForPlayer(playerId, missionId);
  }

  /**
   * Get missions by player and game with status filter and pagination
   * @param playerId Player ID
   * @param gameId Game ID
   * @param status Optional filter by status
   * @param page Page number (1-based)
   * @param limit Items per page
   * @returns Object with missions array and total count
   */
  async getPlayerMissionsByGame(
    playerId: number,
    gameId: number,
    status: MissionStatus | 'all' = 'all',
    page: number = 1,
    limit: number = 10
  ): Promise<{ missions: Mission[]; total: number }> {
    return this.missionRepository.findByPlayerAndGame(
      playerId,
      gameId,
      status,
      page,
      limit
    );
  }
}