# Project Requirements Document: Salla Gamification System

## Overview

**Product Name:** Salla Gamification System  
**Prepared For:** Salla E-commerce SaaS Platform

The Salla Gamification System is designed to improve merchant onboarding through a dynamic, reward-based experience. It introduces missions composed of tasks that guide new merchants through essential steps to set up their stores. This gamified approach enhances engagement, increases retention, and streamlines platform adoption.

## Purpose

The main goal is to provide an interactive onboarding experience that encourages merchants to complete key setup activities through missions, rewards, and visible progress. This system supports multi-tenancy and can be dynamically configured at runtime.

## Objectives

- Encourage merchants to complete store setup through structured missions
- Reward merchants with points, badges, or coupons upon task completion
- Allow optional task skipping without penalties
- Track onboarding progress in real time per merchant (Store ID scoped)
- Enable runtime task/reward configuration without deployments
- Support mission/task dependencies and time-based missions

## Key Features

### Onboarding Tasks

- Tasks include: Add First Product, Set Store Logo, Connect Payment Gateway, etc.
- Tasks are grouped into missions
- Tasks can be unlocked based on mission configuration, date
- Tasks are dynamic and linked to platform events that stored in `event.json`

### Players

- Player is the way we represent the Store or anyone should play the game in this system.
- Player can retreive games, can complete task, and take reward and badges
- Player is the entity that we target in the gamification system
- Player are dynamic and linked to platform events that come to `/events` API

### Games

- Game has many Missions
- Game is a container of sequence of Missions
- Game may showed to specific player, all player.

### Missions

- Missions has many tasks
- Mission may showed directly after create, may have date period, may be recurring
- Mission may showed depend on completion of other mission
- Mission may showed to specific player, all player, player query
- Missions have points to reach, if the completed tasks points sum reach Missions point, the player take reward.

### Reward System

- Rewards are granted upon mission completion
- Rewards include Leaderboard, badges, coupons, or additional subscription.

### Task Management

- Tasks can be skipped by the merchant
- Ignored tasks are marked and excluded from rewards
- Ignoring a task removes the entire associated mission

### Progress Tracking

- Merchant progress is updated in real time once any event triggered
- event should reach the system via API that called via jitsu and recieve all the events
- Progress is visible in the dashboard via a UI component and our system should present API to serve this component(we shouldn't have UI component, we should just have API)
- Data is scoped by player ID for multi Games, and scoped by game id

### Multi-Game Architecture

- Each Game's data is partitioned by player ID
- Global or games-group specific configurations supported

### Needed API

- Event API: recieve all the events from Salla(Jitsu)
- Merchant UI APIs: APIs to return data like (opened missions and tasks, completed missions and tasks, Rewards like Leaderboards, badges, coupons, or additional subscription)
- collect Reward : click to collect Reward API

## Functional Requirements

| ID   | Description                                                                 | User Story                                                                 | Expected Behavior/Outcome                                                                                                     |
|------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| FR1  | Present API to Display onboarding tasks to merchants on the dashboard                     | As a merchant, I want to see onboarding tasks so I can complete them easily | Merchants see their relevant tasks in the dashboard UI                                                                      |
| FR2  | Progress tracking through task completion through API                                 | As a merchant, I want to track my progress by completing tasks               | Completing tasks automatically progresses the related mission                         |
| FR3  | Automatically detect task completion based on events                       | As a merchant, I want the system to track what I do and update tasks         | The system listens to platform events and updates progress in real-time               |
| FR4  | Reward distribution upon mission completion                                | As a merchant, I want to receive rewards when I finish missions              | When a mission is completed, a reward is automatically assigned to player via API call                       |
| FR5  | Ability to ignore tasks manually                                           | As a merchant, I want to skip irrelevant tasks                               | Merchants can ignore tasks            |
| FR6  | Mission visibility and completion rules                                    | As a merchant, I want missions to unlock based on other mission or specific date/time        | Missions become visible and completable only when their rules are satisfied           |
| FR7  | Save and update progress in real-time                                      | As a merchant, I want my task status to save instantly                       | Task progress is saved and shown immediately after events or interactions             |

## Non-Functional Requirements

| ID    | Description                                                                                     | User Story                                                                                   | Expected Behavior/Outcome                                                                 |
|--------|-------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| NFR1   | Support multiple concurrent merchants                                                           | As a platform operator, I want the system to support all merchants at once                  | System handles concurrent merchant sessions and scales accordingly                        |
| NFR2   | Event processing response time < 1 second                                                       | As a merchant, I want task completion to be reflected quickly                               | System processes events and updates progress in less than one second                      |
| NFR3   | Configuration updates should take effect quickly (under a configured cache time)               | As an admin, I want new tasks to be visible shortly after I add them                        | Cached configs refresh and propagate within a short, defined time window                 |
| NFR4   | Merchant data must be isolated and secure                                                       | As a merchant, I want my progress to be private and safe                                    | Data for each merchant is stored and protected by unique player ID                         |
| NFR5   | Automatically scale under high load                                                             | As a platform operator, I want the system to scale without downtime                         | Uses serverless or auto-scaling infrastructure to adapt to load dynamically               |

## Tech Stack & Integration

- **Backend:** Hono.js ( ready to use in cloudflare worker)
- **Frontend:** no front end for now, but we need to have swagger documentation page
- **Analytics:** Event tracking via [Jitsu](https://jitsu.com/) using [Segment](https://segment.com/) event schema standards

## Milestones & Phases

### Phase 1: MVP

- Tasks, Missions, and Rewards Engine and API's
- System recieve events from Salla(merchant)
- Reward issuance and progress tracking

## Success Metrics

- Onboarding task completion rate > 60%
- Increase in 7-day merchant retention
- 10% boost in store setup completeness within the first week of signup

