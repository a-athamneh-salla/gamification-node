"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRoutes = exports.api = void 0;
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const logger_1 = require("hono/logger");
const pretty_json_1 = require("hono/pretty-json");
const missions_1 = require("./missions");
const tasks_1 = require("./tasks");
const rewards_1 = require("./rewards");
const leaderboard_1 = require("./leaderboard");
const events_1 = require("./events");
const games_1 = require("./games");
const players_1 = require("./players");
// Create the main API router
const api = new hono_1.Hono();
exports.api = api;
exports.apiRoutes = api;
// Apply middleware
api.use('*', (0, logger_1.logger)());
api.use('*', (0, pretty_json_1.prettyJSON)());
api.use('*', (0, cors_1.cors)({
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
api.route('/events', events_1.eventRoutes);
api.route('/games', games_1.gameRoutes);
api.route('/players', players_1.playerRoutes);
api.route('/missions', missions_1.missionRoutes);
api.route('/tasks', tasks_1.taskRoutes);
api.route('/rewards', rewards_1.rewardRoutes);
api.route('/leaderboard', leaderboard_1.leaderboardRoutes);
