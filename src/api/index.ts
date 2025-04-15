import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { DB } from '../db';
import { missionRoutes } from './missions';
import { taskRoutes } from './tasks';
import { rewardRoutes } from './rewards';
import { leaderboardRoutes } from './leaderboard';
import { eventRoutes } from './events';

// Create the main API router
const api = new Hono<{
  Variables: {
    db: DB;
  };
}>();

// Apply middleware
api.use('*', logger());
api.use('*', prettyJSON());
api.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 600,
}));

// Health check endpoint
api.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'Salla Gamification API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Register API routes
api.route('/events', eventRoutes);
api.route('/missions', missionRoutes);
api.route('/tasks', taskRoutes);
api.route('/rewards', rewardRoutes);
api.route('/leaderboard', leaderboardRoutes);

export { api };