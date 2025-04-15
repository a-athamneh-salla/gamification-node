-- Salla Gamification System Database Schema

-- -----------------------------------------------------
-- Table `events`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `events` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `event_name_UNIQUE` (`name` ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `missions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `missions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `points_required` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `start_date` DATETIME NULL,
  `end_date` DATETIME NULL,
  `is_recurring` TINYINT(1) NOT NULL DEFAULT 0,
  `recurrence_pattern` VARCHAR(255) NULL, -- JSON string that defines recurrence (daily, weekly, monthly)
  `prerequisite_mission_id` INT UNSIGNED NULL, -- Required mission before this can be started
  `target_type` ENUM('all', 'specific', 'filtered') NOT NULL DEFAULT 'all',
  `target_stores` TEXT NULL, -- JSON array of store IDs or filter conditions
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_missions_missions_idx` (`prerequisite_mission_id` ASC),
  CONSTRAINT `fk_missions_missions`
    FOREIGN KEY (`prerequisite_mission_id`)
    REFERENCES `missions` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `tasks`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `mission_id` INT UNSIGNED NOT NULL,
  `event_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `points` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_optional` TINYINT(1) NOT NULL DEFAULT 0,
  `order` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_tasks_missions_idx` (`mission_id` ASC),
  INDEX `fk_tasks_events_idx` (`event_id` ASC),
  CONSTRAINT `fk_tasks_missions`
    FOREIGN KEY (`mission_id`)
    REFERENCES `missions` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_events`
    FOREIGN KEY (`event_id`)
    REFERENCES `events` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `reward_types`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `reward_types` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `reward_type_name_UNIQUE` (`name` ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `rewards`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rewards` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `mission_id` INT UNSIGNED NOT NULL,
  `reward_type_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `value` TEXT NOT NULL, -- JSON string containing reward details (could be badge ID, coupon code, etc.)
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_rewards_missions_idx` (`mission_id` ASC),
  INDEX `fk_rewards_reward_types_idx` (`reward_type_id` ASC),
  CONSTRAINT `fk_rewards_missions`
    FOREIGN KEY (`mission_id`)
    REFERENCES `missions` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_rewards_reward_types`
    FOREIGN KEY (`reward_type_id`)
    REFERENCES `reward_types` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `store_mission_progress`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `store_mission_progress` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `store_id` INT UNSIGNED NOT NULL,
  `mission_id` INT UNSIGNED NOT NULL,
  `status` ENUM('not_started', 'in_progress', 'completed', 'skipped') NOT NULL DEFAULT 'not_started',
  `points_earned` INT UNSIGNED NOT NULL DEFAULT 0,
  `started_at` DATETIME NULL,
  `completed_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `store_mission_unique_idx` (`store_id` ASC, `mission_id` ASC),
  INDEX `fk_store_mission_progress_missions_idx` (`mission_id` ASC),
  INDEX `fk_store_mission_progress_stores_idx` (`store_id` ASC),
  CONSTRAINT `fk_store_mission_progress_missions`
    FOREIGN KEY (`mission_id`)
    REFERENCES `missions` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_store_mission_progress_stores`
    FOREIGN KEY (`store_id`)
    REFERENCES `stores` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `store_task_progress`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `store_task_progress` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `store_id` INT UNSIGNED NOT NULL,
  `task_id` INT UNSIGNED NOT NULL,
  `status` ENUM('not_started', 'completed', 'skipped') NOT NULL DEFAULT 'not_started',
  `completed_at` DATETIME NULL,
  `skipped_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `store_task_unique_idx` (`store_id` ASC, `task_id` ASC),
  INDEX `fk_store_task_progress_tasks_idx` (`task_id` ASC),
  INDEX `fk_store_task_progress_stores_idx` (`store_id` ASC),
  CONSTRAINT `fk_store_task_progress_tasks`
    FOREIGN KEY (`task_id`)
    REFERENCES `tasks` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_store_task_progress_stores`
    FOREIGN KEY (`store_id`)
    REFERENCES `stores` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `store_rewards`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `store_rewards` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `store_id` INT UNSIGNED NOT NULL,
  `reward_id` INT UNSIGNED NOT NULL,
  `status` ENUM('earned', 'claimed', 'expired') NOT NULL DEFAULT 'earned',
  `earned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `claimed_at` DATETIME NULL,
  `expires_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_store_rewards_rewards_idx` (`reward_id` ASC),
  INDEX `fk_store_rewards_stores_idx` (`store_id` ASC),
  CONSTRAINT `fk_store_rewards_rewards`
    FOREIGN KEY (`reward_id`)
    REFERENCES `rewards` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_store_rewards_stores`
    FOREIGN KEY (`store_id`)
    REFERENCES `stores` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `event_logs`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `event_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `store_id` INT UNSIGNED NOT NULL,
  `event_id` INT UNSIGNED NOT NULL,
  `payload` JSON NULL, -- Store the complete event payload for debugging or advanced processing
  `processed` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_event_logs_events_idx` (`event_id` ASC),
  INDEX `fk_event_logs_stores_idx` (`store_id` ASC),
  CONSTRAINT `fk_event_logs_events`
    FOREIGN KEY (`event_id`)
    REFERENCES `events` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_event_logs_stores`
    FOREIGN KEY (`store_id`)
    REFERENCES `stores` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `leaderboard`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `leaderboard` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `store_id` INT UNSIGNED NOT NULL,
  `total_points` INT UNSIGNED NOT NULL DEFAULT 0,
  `completed_missions` INT UNSIGNED NOT NULL DEFAULT 0,
  `completed_tasks` INT UNSIGNED NOT NULL DEFAULT 0,
  `rank` INT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `leaderboard_store_unique_idx` (`store_id` ASC),
  INDEX `leaderboard_points_idx` (`total_points` DESC),
  CONSTRAINT `fk_leaderboard_stores`
    FOREIGN KEY (`store_id`)
    REFERENCES `stores` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Insert initial reward types
-- -----------------------------------------------------
INSERT INTO `reward_types` (`name`, `description`) VALUES 
('badge', 'Achievement badges displayed on merchant profile'),
('coupon', 'Discount coupons for Salla services or products'),
('subscription_benefit', 'Additional features or services for the merchant'),
('leaderboard_position', 'Special position or recognition in the leaderboard');

-- -----------------------------------------------------
-- Procedure to populate events from events.json
-- -----------------------------------------------------
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS `populate_events_from_json`(IN events_json JSON)
BEGIN
  DECLARE i INT DEFAULT 0;
  DECLARE total INT;
  
  SET total = JSON_LENGTH(JSON_EXTRACT(events_json, '$.data'));
  
  WHILE i < total DO
    INSERT INTO `events` (`id`, `name`)
    VALUES (
      JSON_EXTRACT(events_json, CONCAT('$.data[', i, '].id')),
      JSON_UNQUOTE(JSON_EXTRACT(events_json, CONCAT('$.data[', i, '].name')))
    )
    ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
    
    SET i = i + 1;
  END WHILE;
END //

DELIMITER ;

-- To use the procedure, you would execute:
-- SET @events_json = (SELECT your_json_data);
-- CALL populate_events_from_json(@events_json);
