import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { logger } from 'hono/logger';

import { initializeDb, runMigrations } from './db';
import { apiRoutes } from './api';

// Define environment variables and bindings interface
type Bindings = {
  ENVIRONMENT: 'production' | 'staging' | 'development';
  DB: D1Database;
}

// Create the Hono app
const app = new Hono<{ Bindings: Bindings }>();

// Register middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
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

// Run migrations on each worker initialization
app.use('*', async (c, next) => {
  if (c.env.ENVIRONMENT !== 'production') {
    await runMigrations(c.env.DB);
  }
  
  // Add DB instance to the context variables
  c.set('db', initializeDb(c.env.DB));
  
  await next();
});

// Mount API routes under /api
app.route('/api', apiRoutes);

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
export default app;