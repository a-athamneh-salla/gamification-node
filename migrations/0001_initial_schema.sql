-- Initial Schema for Salla Gamification System
-- Migration: 0001_initial_schema

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  start_date TEXT,
  end_date TEXT,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_players TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Missions table
CREATE TABLE IF NOT EXISTS missions (
  id INTEGER PRIMARY KEY,
  game_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  start_date TEXT,
  end_date TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_pattern TEXT,
  prerequisite_mission_id INTEGER,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_players TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games (id),
  FOREIGN KEY (prerequisite_mission_id) REFERENCES missions (id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  mission_id INTEGER NOT NULL,
  event_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  is_optional INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mission_id) REFERENCES missions (id),
  FOREIGN KEY (event_id) REFERENCES events (id)
);

-- Reward types table
CREATE TABLE IF NOT EXISTS reward_types (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY,
  mission_id INTEGER NOT NULL,
  reward_type_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  value TEXT NOT NULL, -- JSON string containing reward details
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mission_id) REFERENCES missions (id),
  FOREIGN KEY (reward_type_id) REFERENCES reward_types (id)
);

-- Player mission progress table
CREATE TABLE IF NOT EXISTS player_mission_progress (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  mission_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  points_earned INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mission_id) REFERENCES missions (id),
  FOREIGN KEY (game_id) REFERENCES games (id),
  UNIQUE (player_id, game_id, mission_id)
);

-- Player task progress table
CREATE TABLE IF NOT EXISTS player_task_progress (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  completed_at TEXT,
  skipped_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks (id),
  FOREIGN KEY (game_id) REFERENCES games (id),
  UNIQUE (player_id, game_id, task_id)
);

-- Player rewards table
CREATE TABLE IF NOT EXISTS player_rewards (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  reward_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'earned',
  earned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reward_id) REFERENCES rewards (id),
  FOREIGN KEY (game_id) REFERENCES games (id),
  UNIQUE (player_id, game_id, reward_id)
);

-- Event logs table
CREATE TABLE IF NOT EXISTS event_logs (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  event_id INTEGER NOT NULL,
  payload TEXT,
  processed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events (id),
  FOREIGN KEY (game_id) REFERENCES games (id)
);

-- Leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  completed_missions INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games (id),
  UNIQUE (player_id, game_id)
);

-- Insert default reward types
INSERT INTO reward_types (id, name, description) VALUES 
(1, 'badge', 'Achievement badges displayed on player profile'),
(2, 'coupon', 'Discount coupons for Salla services'),
(3, 'subscription', 'Free subscription period or tier upgrade'),
(4, 'feature', 'Early access to new platform features');

-- Create indexes for better query performance
CREATE INDEX idx_events_name ON events(name);
CREATE INDEX idx_tasks_event_id ON tasks(event_id);
CREATE INDEX idx_tasks_mission_id ON tasks(mission_id);
CREATE INDEX idx_missions_active ON missions(is_active);
CREATE INDEX idx_missions_game_id ON missions(game_id);
CREATE INDEX idx_player_mission_status ON player_mission_progress(player_id, status);
CREATE INDEX idx_player_mission_game ON player_mission_progress(game_id);
CREATE INDEX idx_player_task_status ON player_task_progress(player_id, status);
CREATE INDEX idx_player_task_game ON player_task_progress(game_id);
CREATE INDEX idx_leaderboard_points ON leaderboard(total_points DESC);
CREATE INDEX idx_leaderboard_game ON leaderboard(game_id);
CREATE INDEX idx_event_logs_player_game ON event_logs(player_id, game_id);