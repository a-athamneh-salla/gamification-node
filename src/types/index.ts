/**
 * Event Payload sent from Jitsu
 */
export interface EventPayload {
  player_id: number;
  game_id: number;
  event: string;
  merchant?: {
    id: string | number;
  };
  event_data?: any;
}

/**
 * LeaderboardService interface
 */
export interface ILeaderboardService {
  getLeaderboard(page?: number, limit?: number): Promise<{ entries: LeaderboardEntry[], total: number }>;
  getLeaderboardPositionWithContext(playerId: number, context?: number): Promise<LeaderboardContextResult>;
  getLeaderboardStatistics(): Promise<LeaderboardStats>;
  recalculateLeaderboard(): Promise<LeaderboardRecalculationResult>;
  getPlayerRanking(playerId: number): Promise<LeaderboardEntry | null>;
  updateLeaderboard(playerId: number, missionCompleted?: boolean, tasksCompleted?: number, points?: number): Promise<boolean>;
  getPlayerStats(playerId: number): Promise<{ totalPoints: number; completedMissions: number; completedTasks: number }>;
  updatePlayerScore(playerId: number, points: number): Promise<void>;
}

/**
 * RewardService interface
 */
export interface IRewardService {
  grantRewards(playerId: number, rewardsList: Reward[], context?: { missionId?: number; gameId?: number }): Promise<PlayerReward[]>;
  grantRewardsForMission(missionId: number, playerId: number, gameId?: number): Promise<Reward[]>;
  claimReward(playerId: number, rewardId: number): Promise<RewardOperationResult>;
  getPlayerRewards(playerId: number, status?: RewardStatus | 'all', page?: number, limit?: number): Promise<{ rewards: PlayerReward[], total: number }>;
  getUnclaimedRewards(playerId: number, page?: number, limit?: number): Promise<{ rewards: PlayerReward[], total: number }>;
}

/**
 * SallaEvent interface
 */
export interface SallaEvent {
  storeId: number;
  type: string;
  timestamp: string;
  properties: Record<string, any>;
  player_id?: number;
  game_id?: number;
  event?: string;
  merchant?: {
    id: string | number;
  };
  event_data?: any;
}

/**
 * TaskRepository interface extensions
 */
export interface TaskRepository {
  findIncompleteTasksByEvent(eventId: string, playerId: number): Promise<Task[]>;
  findByPlayerAndTaskId(playerId: number, taskId: number): Promise<any>;
  updatePlayerTaskProgress(taskId: number, playerId: number, progress: number, isCompleted: boolean): Promise<any>;
  findByMissionId(missionId: number): Promise<Task[]>;
  findAllByPlayerAndMissionId(playerId: number, missionId: number): Promise<any[]>;
  updateTaskProgress(taskId: number, playerId: number, status: TaskStatus, progress: number, isCompleted: boolean): Promise<any>;
  findById(taskId: number): Promise<Task | null>;
  findByIdForPlayer(playerId: number, taskId: number): Promise<Task | null>;
  findByEventType(eventType: string): Promise<Task[]>;
  findByEvent(eventId: string): Promise<Task[]>;
  findByMission(missionId: number): Promise<Task[]>;
  findAllCompletedTasksByMission(missionId: number, playerId: number): Promise<Task[]>;
  updateProgress(taskId: number, playerId: number, status: TaskStatus): Promise<Task | null>;
  findByPlayer(playerId: number, page?: number, limit?: number): Promise<{ tasks: Task[], total: number }>;
  findByPlayerAndMission(playerId: number, missionId: number, status?: TaskStatus | 'all', page?: number, limit?: number): Promise<{ tasks: Task[], total: number }>;
  getTaskWithEvent(taskId: number): Promise<Task>;
}

/**
 * MissionRepository interface extensions
 */
export interface MissionRepository {
  completeMission(missionId: number, playerId: number, gameId: number, pointsEarned: number): Promise<any>;
  findByIdForStore(missionId: number, storeId: number): Promise<Mission | null>;
  findByIdForPlayer(playerId: number, missionId: number): Promise<Mission | null>;
  updateProgress(missionId: number, playerId: number, status: MissionStatus, progress: number): Promise<Mission>;
}

/**
 * EventRepository interface
 */
export interface EventRepository {
  logEvent(eventData: { type: string; playerId: number; data: string; timestamp: string }): Promise<any>;
  getAllEvents(): Promise<Event[]>;
  getEventById(eventId: number): Promise<Event | null>;
  getEventByName(name: string): Promise<Event | null>;
}

/**
 * PlayerRepository interface
 */
export interface PlayerRepository {
  findById(id: number): Promise<Player | null>;
  findByExternalId(externalId: string): Promise<Player | null>;
  getOrCreatePlayer(storeId: number, externalId?: string): Promise<Player>;
  create(data: Partial<Player>): Promise<Player>;
  update(id: number, data: Partial<Player>): Promise<Player | null>;
  delete(id: number): Promise<boolean>;
  addPoints(playerId: number, points: number): Promise<Player | null>;
}

/**
 * Mission status types
 */
export type MissionStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

/**
 * Task status types
 */
export type TaskStatus = 'not_started' | 'completed' | 'skipped';

/**
 * Reward status types
 */
export type RewardStatus = 'earned' | 'claimed' | 'expired';

/**
 * Target type for games and missions
 */
export type TargetType = 'all' | 'specific' | 'filtered';

/**
 * For backwards compatibility, alias TargetType as MissionTargetType
 */
export type MissionTargetType = TargetType;

/**
 * Game entity
 */
export interface Game {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  targetType: TargetType;
  targetPlayers?: string; // JSON string of target player IDs or filter criteria
  missions?: Mission[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Player entity (replacing Store)
 */
export interface Player {
  id: number;
  externalId: string; // External ID from Salla
  name: string;
  email?: string;
  metadata?: string; // JSON string with additional player data
  points?: number;
  totalPoints?: number;
  tasksCompleted?: number;
  missionsCompleted?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Event with optional task and progress information
 */
export interface Event {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Task with optional progress information
 */
export interface Task {
  id: number;
  missionId: number;
  gameId?: number;
  eventId: string;
  name: string;
  description?: string | null;
  points: number;
  isOptional: boolean;
  isActive: boolean;
  requiredProgress: number;
  order: number;
  status?: TaskStatus;
  progress?: number;
  completedAt?: string;
  skippedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Mission with optional tasks and progress information
 */
export interface Mission {
  id: number;
  gameId: number;
  name: string;
  description?: string | null;
  pointsRequired: number;
  requiredPoints?: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  isRecurring: boolean;
  recurrencePattern?: string;
  prerequisiteMissionId?: number;
  prerequisiteMission?: Mission;
  targetType: TargetType;
  targetPlayers?: string;
  affectsLeaderboard?: boolean;
  leaderboardPoints?: number;
  game?: Game;
  tasks?: Task[];
  rewards?: Reward[];
  status?: MissionStatus;
  pointsEarned?: number;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
  skippedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Mission with tasks and progress information
 */
export interface MissionWithTasks extends Mission {
  tasks: Task[];
  game: Game;
}

/**
 * Task with detailed progress information
 */
export interface TaskWithProgress extends Task {
  event: Event;
  status: TaskStatus;
  progress?: number;
}

/**
 * Reward type definition
 */
export interface RewardType {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Reward with optional status information
 */
export interface Reward {
  id: number;
  missionId: number;
  gameId: number;
  rewardTypeId: number;
  name: string;
  description?: string;
  value: string;
  type?: RewardType;
  status?: RewardStatus;
  earnedAt?: string;
  claimedAt?: string;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Player reward with detailed status information
 */
export interface PlayerReward extends Reward {
  playerId: number;
  status: RewardStatus;
  earnedAt: string;
  claimedAt?: string;
  expiresAt?: string;
}

/**
 * Leaderboard entry for a player
 */
export interface LeaderboardEntry {
  id: number;
  playerId: number;
  gameId: number;
  totalPoints: number;
  completedMissions: number;
  completedTasks: number;
  rank: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Leaderboard statistics
 */
export interface LeaderboardStats {
  totalPlayers: number;
  topScore: number;
  averageScore: number;
  totalMissionsCompleted: number;
  totalTasksCompleted: number;
  lastUpdated: string;
}

/**
 * Player ranking information
 */
export interface PlayerRank {
  playerId: number;
  gameId: number;
  points: number;
  rank: number;
  player: {
    id: number;
    name: string;
    externalId: string;
    email: string | null;
  };
  lastUpdated: string;
}

/**
 * Generic response for success/failure operations
 */
export interface OperationResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * Task operation result
 */
export interface TaskOperationResult extends OperationResult {
  taskId?: number;
  taskStatus?: TaskStatus;
}

/**
 * Mission operation result
 */
export interface MissionOperationResult extends OperationResult {
  missionId?: number;
  missionStatus?: MissionStatus;
  tasksCompleted?: number;
  tasksTotal?: number;
}

/**
 * Reward operation result
 */
export interface RewardOperationResult extends OperationResult {
  reward?: Reward;
}

/**
 * Event processing result
 */
export interface EventProcessingResult extends OperationResult {
  event?: string;
  playerId?: number;
  gameId?: number;
  taskUpdates?: TaskOperationResult[];
  missionUpdates?: MissionOperationResult[];
  rewardUpdates?: RewardOperationResult[];
}

/**
 * Leaderboard context result
 */
export interface LeaderboardContextResult extends OperationResult {
  playerPosition?: LeaderboardEntry;
  playersAbove?: LeaderboardEntry[];
  playersBelow?: LeaderboardEntry[];
  totalPlayers?: number;
}

/**
 * Leaderboard recalculation result
 */
export interface LeaderboardRecalculationResult extends OperationResult {
  entriesUpdated: number;
  timestamp: string;
}

/**
 * Game progress tracking result
 */
export interface GameProgressResult extends OperationResult {
  game: Game;
  completedMissions: number;
  totalMissions: number;
  completedTasks: number;
  totalTasks: number;
  progressPercentage: number;
}