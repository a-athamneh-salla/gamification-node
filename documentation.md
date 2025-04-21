# Salla Gamification System Documentation

## Overview

The Salla Gamification System is designed to improve merchant onboarding through a dynamic, reward-based experience. It introduces missions composed of tasks that guide new merchants through essential steps to set up their stores within various games.

## System Architecture

- **Backend:** Hono.js (runs in Cloudflare Workers)
- **Database:** Cloudflare D1
- **ORM:** Drizzle ORM
- **Testing:** Jest
- **API Documentation:** Swagger
- **Analytics:** Event tracking via Jitsu using Segment event schema
- **Multi-tenant Architecture:** Data partitioned by Player ID and Game ID

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Cloudflare Workers account
- Wrangler CLI

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your specific configuration
```

4. Set up the database:

```bash
npm run setup-db
```

5. Start the development server:

```bash
npm run dev
```

## API Reference

### Event API

The Event API receives events from Jitsu and processes them to update mission and task progress.

#### Receive Event

```sh
POST /api/events
```

Request Body:

```json
{
  "event": "Product Added",
  "player_id": 123,
  "game_id": 1,
  "timestamp": "2025-04-14T12:00:00Z",
  "properties": {
    // Additional event properties
  }
}
```

Response:

```json
{
  "success": true,
  "message": "Event processed successfully",
  "data": {
    "tasks_completed": ["task_id1", "task_id2"],
    "missions_completed": ["mission_id1"]
  }
}
```

### Game APIs

#### Get Game Details

```sh
GET /api/games/:id
```

Response:

```json
{
  "data": {
    "id": 1,
    "name": "Store Onboarding",
    "description": "Complete essential steps to set up your store",
    "active": true,
    "created_at": "2025-03-01T00:00:00Z",
    "updated_at": "2025-04-01T00:00:00Z"
  }
}
```

#### List Games

```sh
GET /api/games
```

Response:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Store Onboarding",
      "description": "Complete essential steps to set up your store",
      "active": true
    },
    {
      "id": 2,
      "name": "Marketing Master",
      "description": "Improve your marketing strategy",
      "active": true
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 2
  }
}
```

### Player APIs

#### Get Player Details

```sh
GET /api/players/:id
```

Response:

```json
{
  "data": {
    "id": 123,
    "name": "Tech World Store",
    "email": "owner@techworld.com",
    "created_at": "2025-02-15T10:30:00Z",
    "total_points": 1100,
    "completed_missions": 7,
    "completed_tasks": 28
  }
}
```

### Mission APIs

#### Get Available Missions

Returns missions available to a specific player in a specific game.

```sh
GET /api/missions
```

Query Parameters:

- `player_id` - ID of the player (required)
- `game_id` - ID of the game (required)
- `status` - Filter by mission status (not_started, in_progress, completed, all)
- `page` - Page number for pagination
- `limit` - Number of records per page

Response:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Store Setup",
      "description": "Complete essential tasks to set up your store",
      "points_required": 100,
      "points_earned": 25,
      "progress_percentage": 25,
      "status": "in_progress",
      "tasks": [
        {
          "id": 1,
          "name": "Add First Product",
          "description": "Add your first product to your store",
          "points": 25,
          "status": "completed"
        },
        {
          "id": 2,
          "name": "Set Store Logo",
          "description": "Upload your store logo",
          "points": 25,
          "status": "not_started"
        }
        // More tasks...
      ]
    }
    // More missions...
  ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 5
  }
}
```

#### Get Mission Details

```sh
GET /api/missions/:id
```

Query Parameters:
- `player_id` - ID of the player (required)
- `game_id` - ID of the game (required)

Response:

```json
{
  "data": {
    "id": 1,
    "name": "Store Setup",
    "description": "Complete essential tasks to set up your store",
    "points_required": 100,
    "points_earned": 25,
    "progress_percentage": 25,
    "status": "in_progress",
    "tasks": [
      // Task details...
    ],
    "reward": {
      "id": 1,
      "name": "Premium Badge",
      "description": "Premium store badge for your profile",
      "type": "badge"
    }
  }
}
```

#### Get Mission Tasks

```sh
GET /api/missions/:id/tasks
```

Query Parameters:
- `player_id` - ID of the player (required)
- `game_id` - ID of the game (required)

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Add First Product",
      "description": "Add your first product to your store",
      "points": 25,
      "status": "completed"
    },
    {
      "id": 2,
      "name": "Set Store Logo",
      "description": "Upload your store logo",
      "points": 25,
      "status": "not_started"
    }
  ]
}
```

#### Get Mission Rewards

```sh
GET /api/missions/:id/rewards
```

Query Parameters:
- `player_id` - ID of the player (required)
- `game_id` - ID of the game (required)

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Premium Badge",
      "description": "Premium store badge for your profile",
      "type": "badge",
      "status": "earned"
    }
  ]
}
```

### Task APIs

#### Skip Task

```sh
POST /api/tasks/:id/skip
```

Request Body:
```json
{
  "player_id": 123,
  "game_id": 1
}
```

Response:

```json
{
  "success": true,
  "message": "Task skipped successfully",
  "data": {
    "task_id": 2,
    "status": "skipped"
  }
}
```

### Reward APIs

#### Get Player Rewards

```sh
GET /api/rewards
```

Query Parameters:
- `player_id` - ID of the player (required)
- `game_id` - ID of the game (required)
- `status` - Filter by reward status (earned, claimed, expired)
- `page` - Page number for pagination
- `limit` - Number of records per page

Response:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Premium Badge",
      "description": "Premium store badge for your profile",
      "type": "badge",
      "status": "earned",
      "earned_at": "2025-04-10T09:30:00Z",
      "expires_at": null
    }
    // More rewards...
  ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 3
  }
}
```

#### Claim Reward

```sh
POST /api/rewards/:id/claim
```

Request Body:
```json
{
  "player_id": 123,
  "game_id": 1
}
```

Response:

```json
{
  "success": true,
  "message": "Reward claimed successfully",
  "data": {
    "reward_id": 1,
    "status": "claimed",
    "claimed_at": "2025-04-14T12:05:30Z"
  }
}
```

### Leaderboard API

#### Get Leaderboard

```sh
GET /api/leaderboard
```

Query Parameters:
- `game_id` - ID of the game (required)
- `page` - Page number for pagination
- `limit` - Number of records per page

Response:

```json
{
  "data": [
    {
      "rank": 1,
      "player_id": 456,
      "player_name": "Fashion Hub",
      "total_points": 1250,
      "completed_missions": 8,
      "completed_tasks": 32
    },
    {
      "rank": 2,
      "player_id": 123,
      "player_name": "Tech World",
      "total_points": 1100,
      "completed_missions": 7,
      "completed_tasks": 28
    }
    // More players...
  ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 50
  }
}
```

## Development

### Project Structure

```rb
/src
  /api          # API routes
    /events.ts    # Event handling endpoint
    /games.ts     # Games endpoints
    /players.ts   # Players endpoints
    /missions.ts  # Mission endpoints
    /rewards.ts   # Reward endpoints
    /tasks.ts     # Task endpoints
    /leaderboard.ts # Leaderboard endpoints
  /models       # Data models
    /event.ts     # Event model
    /game.ts      # Game model
    /mission.ts   # Mission model
    /task.ts      # Task model
    /reward.ts    # Reward model
    /player.ts    # Player model
  /services     # Business logic
    /event-processor.ts  # Event processing service
    /mission-service.ts  # Mission management service
    /reward-service.ts   # Reward distribution service
    /task-service.ts     # Task management service
    /leaderboard-service.ts # Leaderboard service
  /repositories # Data access
    /base-repository.ts  # Base repository abstract class
    /event-repository.ts # Event data repository
    /game-repository.ts  # Game data repository
    /mission-repository.ts # Mission data repository
    /task-repository.ts  # Task data repository
    /reward-repository.ts # Reward data repository
    /player-repository.ts # Player data repository
    /leaderboard-repository.ts # Leaderboard data repository
  /utils        # Utility functions
    /validators.ts # Input validation
    /error-handling.ts # Error handling utilities
  /middleware   # Request middleware
    /auth.ts      # Authentication middleware
    /validation.ts # Request validation middleware
  /config       # Configuration
    /index.ts     # Configuration management
  /types        # TypeScript type definitions
    /index.ts     # Shared type definitions
  /index.ts    # Main entry point
/test        # Test files
  /unit         # Unit tests
  /integration  # Integration tests
  /fixtures     # Test fixtures
```

### Running Tests

To run the tests:

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

### SOLID Principles Implementation

This project follows the SOLID principles:

1. **S - Single Responsibility Principle**

   - Each class has a single responsibility
   - Services, repositories, and controllers are separated

2. **O - Open/Closed Principle**

   - Core entities are extended without modification
   - Strategy pattern used for different mission types

3. **L - Liskov Substitution Principle**

   - Base repository pattern allows for substitution of different data access implementations
   - All repositories implement the same interface

4. **I - Interface Segregation Principle**

   - Small, specific interfaces used instead of large, general-purpose ones
   - Client-specific interfaces provided where needed

5. **D - Dependency Inversion Principle**

   - High-level modules depend on abstractions
   - Dependency injection used throughout

### Error Handling

The API uses standard HTTP status codes:

- 200: Success
- 400: Bad request (validation error)
- 401: Unauthorized
- 403: Forbidden
- 404: Resource not found
- 422: Unprocessable entity
- 500: Server error

Error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    "Detailed error 1",
    "Detailed error 2"
  ]
}
```

## Deployment

### Development Environment

```bash
npm run dev
```

### Production Deployment

```bash
npm run deploy
```

This will build and deploy the application to Cloudflare Workers.

## Troubleshooting

Common issues and their solutions:

1. **Database connection issues**

   - Check D1 database binding in wrangler.toml
   - Verify environment variables

2. **Event processing failures**

   - Check event format against expected schema
   - Verify event ID exists in the events table

3. **Mission not appearing for player**

   - Check mission targeting configuration
   - Verify prerequisite missions are completed
   - Check start/end dates for the game

## Contributing

1. Follow the coding style guidelines
2. Write tests for new features
3. Keep documentation up to date
4. Use feature branches and pull requests