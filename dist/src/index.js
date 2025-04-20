"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const pretty_json_1 = require("hono/pretty-json");
const logger_1 = require("hono/logger");
const db_1 = require("./db");
const api_1 = require("./api");
// Create the Hono app
const app = new hono_1.Hono();
// Register middleware
app.use('*', (0, logger_1.logger)());
app.use('*', (0, pretty_json_1.prettyJSON)());
app.use('*', (0, cors_1.cors)({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
}));
// Health check endpoint
app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        environment: c.env.ENVIRONMENT,
        timestamp: new Date().toISOString()
    });
});
// Initialize DB on each request
app.use('*', async (c, next) => {
    // Add DB instance to the context variables
    c.set('db', (0, db_1.initializeDb)(c.env.DB));
    await next();
});
// Mount API routes under /api
app.route('/api', api_1.apiRoutes);
// Default 404 handler
app.notFound((c) => {
    return c.json({
        success: false,
        message: 'Not Found',
        path: c.req.path
    }, 404);
});
// Global error handler
app.onError((err, c) => {
    console.error(`[Error] ${err.message}`, err.stack);
    return c.json({
        success: false,
        message: err.message,
        path: c.req.path
    }, 500);
});
// Export for Cloudflare Workers
exports.default = app;
