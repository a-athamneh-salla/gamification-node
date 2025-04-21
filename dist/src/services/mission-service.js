"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionService = void 0;
/**
 * Mission Service
 * Handles business logic for missions
 */
class MissionService {
    constructor(missionRepository) {
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
    async getPlayerMissions(playerId, status, page = 1, limit = 10) {
        return this.missionRepository.findByPlayer(playerId, status, page, limit);
    }
    /**
     * Get mission by ID for a player
     * @param playerId Player ID
     * @param missionId Mission ID
     * @returns Mission with progress info or null
     */
    async getMissionById(playerId, missionId) {
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
    async getPlayerMissionsByGame(playerId, gameId, status = 'all', page = 1, limit = 10) {
        return this.missionRepository.findByPlayerAndGame(playerId, gameId, status, page, limit);
    }
}
exports.MissionService = MissionService;
