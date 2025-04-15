/**
 * Event Payload sent from Jitsu
 */
export interface EventPayload {
  event: string;
  store_id: number;
  timestamp?: string;
  properties?: Record<string, any>;
  user_properties?: Record<string, any>;
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
 * Target type for missions
 */
export type MissionTargetType = 'all' | 'specific' | 'filtered';

/**
 * Event with optional task and progress information
 */
export interface Event {
  id: number;
  name: string;
  description?: string;
  tasks?: Task[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Task with optional progress information
 */
export interface Task {
  id: number;
  missionId: number;
  eventId: number;
  name: string;
  description?: string;
  points: number;
  isOptional: boolean;
  order: number;
  event?: Event;
  status?: TaskStatus;
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
  name: string;
  description?: string;
  pointsRequired: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  isRecurring: boolean;
  recurrencePattern?: string;
  prerequisiteMissionId?: number;
  prerequisiteMission?: Mission;
  targetType: MissionTargetType;
  targetStores?: string;
  tasks?: Task[];
  rewards?: Reward[];
  status?: MissionStatus;
  pointsEarned?: number;
  progress?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
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
 * Leaderboard entry for a store
 */
export interface LeaderboardEntry {
  id: number;
  storeId: number;
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
  totalStores: number;
  topScore: number;
  averageScore: number;
  totalMissionsCompleted: number;
  totalTasksCompleted: number;
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
  storeId?: number;
  taskUpdates?: TaskOperationResult[];
  missionUpdates?: MissionOperationResult[];
  rewardUpdates?: RewardOperationResult[];
}

/**
 * Leaderboard context result
 */
export interface LeaderboardContextResult extends OperationResult {
  storePosition?: LeaderboardEntry;
  storesAbove?: LeaderboardEntry[];
  storesBelow?: LeaderboardEntry[];
  totalStores?: number;
}

/**
 * Leaderboard recalculation result
 */
export interface LeaderboardRecalculationResult extends OperationResult {
  storesUpdated: number;
}