# GitHub Copilot Instructions for Salla Gamification System

## Project Overview

This is a Gamification System for Salla E-commerce SaaS Platform designed to improve merchant onboarding through a dynamic, reward-based experience. The system introduces missions composed of tasks that guide new merchants through essential steps to set up their stores.

## System Architecture

- **Backend:** Hono.js (designed to run in Cloudflare Workers)
- **Database:** using cloudflare D1 as main DB
- **ORM:** using Drizzle ORM
- **Test:** using jest to write unit test for the project
- **API Documentation:** Swagger
- **Analytics:** Event tracking via Jitsu using Segment event schema standards
- **Multi-tenant Architecture:** Data partitioned by Store ID

## Key Concepts

### Events

- Events are actions performed by merchants on the Salla platform
- Events trigger task completions in the gamification system
- Events are stored in `events.json` and have IDs and names
- Events are received via an API endpoint from Jitsu

### Missions

- A mission is a collection of related tasks
- Missions have points requirements to be completed
- Missions may be time-bound, recurring, or dependent on other missions
- Missions can target specific stores, all stores, or filtered stores

### Tasks

- Tasks are actions merchants need to complete
- Tasks are linked to platform events from `events.json`
- Tasks can be unlocked based on conditions
- Tasks can be skipped by merchants
- Each task contributes points toward mission completion

### Rewards

- Rewards are granted when missions are completed
- Types include: badges, coupons, leaderboard positions, subscription benefits

## API Requirements

1. **Event API**

   - Receives all events from Salla via Jitsu
   - Updates task/mission progress in real-time

2. **Merchant UI APIs**

   - Returns data about opened missions and tasks
   - Returns data about completed missions and tasks
   - Returns information about earned rewards

3. **Reward Collection API**

   - Allows merchants to claim rewards

## Non-Functional Requirements

- Response time < 1 second for event processing
- Support for multiple concurrent merchants
- Secure multi-tenant data partitioning
- Auto-scaling under high load

## Development Preferences

When suggesting code:

- Prioritize TypeScript with proper type definitions
- Follow RESTful API design patterns
- Implement serverless architecture patterns (for Cloudflare Workers)
- Use async/await for asynchronous operations
- Implement proper error handling and logging
- Create clean, well-documented code with JSDoc comments

## File Organization

Suggested project structure:

```html
/src
  /api          # API routes
  /models       # Data models for missions, tasks, rewards
  /services     # Business logic
  /utils        # Utility functions
  /middleware   # Request middleware
  /config       # Configuration
  /types        # TypeScript type definitions
  /index.ts    # Main entry point
/test        # Test files
  /__mocks__    # Mock data for testing
  /__tests__    # Test cases
  /fixtures     # Sample data for testing
  /helpers      # Helper functions for tests

```

## Testing Approach

- Unit tests for service functions
- API endpoint tests
- Event handling tests

## Key Functional Requirements

1. Display onboarding tasks to merchants via API
2. Track progress through task completion
3. Automatically detect task completion based on events
4. Distribute rewards upon mission completion
5. Support optional task skipping
6. Implement mission visibility and completion rules
7. Save and update progress in real-time