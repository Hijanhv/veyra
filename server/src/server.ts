import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { vaultRoutes } from './routes/vaults.js';
import { analyticsRoutes } from './routes/analytics.js';
import { SchedulerService } from './services/SchedulerService.js';
import { SettingsStore } from './cache/settings/SettingsStore.js';

// Load environment variables from .env file if it exists
dotenv.config();

/**
 * Veyra API server - AI-powered yield optimization with automated rebalancing
 */
async function start() {
  const loggerOptions: any = { level: 'info' };
  // Enable pretty logs only if explicitly requested and module is installed
  if (process.env.PRETTY_LOGS === 'true') {
    loggerOptions.transport = { target: 'pino-pretty' };
  }
  const fastify = Fastify({ logger: loggerOptions });

  // Initialize AI-powered scheduler (enabled by default; can be toggled via API)
  const scheduler = new SchedulerService();
  const persisted = SettingsStore.get('scheduler_enabled');
  const envDefault = process.env.ENABLE_AUTO_REBALANCING; // legacy env; if absent, default to on
  const shouldStart = persisted !== undefined
    ? persisted === 'true'
    : (envDefault === undefined ? true : envDefault === 'true');
  if (shouldStart) {
    scheduler.start();
    fastify.log.info('AI-powered auto-rebalancing scheduler started');
  } else {
    fastify.log.info('Scheduler is disabled by settings');
  }

  // Enable CORS for frontend
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000'
  });

  // Register routes
  await fastify.register(vaultRoutes, { prefix: '/api/vaults' });
  await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });

  // Health check with AI system status
  fastify.get('/health', async () => {
  const aiStatus = process.env.ANTHROPIC_API_KEY ? 'enabled' : 'disabled';
  const schedulerStatus = scheduler.getStatus();

    return {
      status: 'operational',
      timestamp: new Date().toISOString(),
      ai: aiStatus,
      scheduler: schedulerStatus,
      indexer: { implementation: 'ponder', managedByServer: false }
    };
  });

  // Scheduler management endpoints
    const verifyAdmin = (req: any, reply: any) => {
      const adminKey = (req.headers['x-admin-key'] || req.headers['X-Admin-Key']) as string | undefined;
      if (!process.env.ADMIN_API_KEY || adminKey !== process.env.ADMIN_API_KEY) {
        reply.status(401).send({ success: false, error: 'Unauthorized' });
        return false;
      }
      return true;
    };

    fastify.get('/admin/scheduler/status', async (req, reply) => {
      if (!verifyAdmin(req, reply)) return;
      return { success: true, data: scheduler.getStatus() };
    });

    fastify.post('/admin/scheduler/stop', async (req, reply) => {
      if (!verifyAdmin(req, reply)) return;
      scheduler.stop();
      SettingsStore.set('scheduler_enabled', 'false');
      return { success: true, message: 'Scheduler stopped' };
    });

    fastify.post('/admin/scheduler/start', async (req, reply) => {
      if (!verifyAdmin(req, reply)) return;
      scheduler.start();
      SettingsStore.set('scheduler_enabled', 'true');
      return { success: true, message: 'Scheduler started' };
    });

  // Start server
  const port = parseInt(process.env.PORT || '8080', 10);
  await fastify.listen({ port, host: '0.0.0.0' });
  fastify.log.info(`Veyra API server running on port ${port}`);
}

// Start server with error handling
start().catch((err) => {
  console.error(err);
  process.exit(1);
});
