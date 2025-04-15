# Salla Gamification System Documentation

## Overview

The Salla Gamification System is designed to improve merchant onboarding through a dynamic, reward-based experience. It introduces missions composed of tasks that guide new merchants through essential steps to set up their stores.

## System Architecture

- **Backend:** Hono.js (runs in Cloudflare Workers)
- **Database:** Cloudflare D1
- **ORM:** Drizzle ORM
- **Testing:** Jest
- **API Documentation:** Swagger
- **Analytics:** Event tracking via Jitsu using Segment event schema

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
  "store_id": 123,
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

### Mission APIs

#### Get Available Missions

Returns missions available to a specific store.

```sh
GET /api/stores/:storeId/missions
```

Query Parameters:

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
GET /api/stores/:storeId/missions/:missionId
```

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

### Task APIs

#### Skip Task

```sh
POST /api/stores/:storeId/tasks/:taskId/skip
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

#### Get Store Rewards

```sh
GET /api/stores/:storeId/rewards
```

Query Parameters:

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
POST /api/stores/:storeId/rewards/:rewardId/claim
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

- `page` - Page number for pagination
- `limit` - Number of records per page

Response:

```json
{
  "data": [
    {
      "rank": 1,
      "store_id": 456,
      "store_name": "Fashion Hub",
      "total_points": 1250,
      "completed_missions": 8,
      "completed_tasks": 32
    },
    {
      "rank": 2,
      "store_id": 123,
      "store_name": "Tech World",
      "total_points": 1100,
      "completed_missions": 7,
      "completed_tasks": 28
    }
    // More stores...
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
    /missions.ts  # Mission endpoints
    /rewards.ts   # Reward endpoints
    /tasks.ts     # Task endpoints
  /models       # Data models
    /event.ts     # Event model
    /mission.ts   # Mission model
    /task.ts      # Task model
    /reward.ts    # Reward model
    /store.ts     # Store model
  /services     # Business logic
    /event-processor.ts  # Event processing service
    /mission-service.ts  # Mission management service
    /reward-service.ts   # Reward distribution service
    /task-service.ts     # Task management service
  /repositories # Data access
    /base-repository.ts  # Base repository abstract class
    /event-repository.ts # Event data repository
    /mission-repository.ts # Mission data repository
    /task-repository.ts  # Task data repository
    /reward-repository.ts # Reward data repository
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

3. **Mission not appearing for store**

   - Check mission targeting configuration
   - Verify prerequisite missions are completed
   - Check start/end dates

## Contributing

1. Follow the coding style guidelines
2. Write tests for new features
3. Keep documentation up to date
4. Use feature branches and pull requests