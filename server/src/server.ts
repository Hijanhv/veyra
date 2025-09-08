import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { vaultRoutes } from './routes/vaults.js';
import { analyticsRoutes } from './routes/analytics.js';
import { tokenRoutes } from './routes/tokens.js';
import { SchedulerService } from './services/SchedulerService.js';
import { InvestmentAgent } from './services/InvestmentAgent.js';
import { Config } from './config.js';

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
  const fastify = Fastify({ logger: loggerOptions, trustProxy: true });

  await fastify.register(cors, {
    origin: ['https://www.veyra.finance'],
    credentials: true,                      // set true only if you use cookies/Authorization in browser
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: [],
    // Preflight tuning
    maxAge: 86400,
    preflight: true,              // default, but be explicit
    strictPreflight: false,       // don't 400 if headers don't perfectly match
    optionsSuccessStatus: 204,
    hook: 'onRequest',
  });


  // Initialize AI-powered scheduler (enabled by default; can be toggled via API)
  const scheduler = new SchedulerService();
  const envDefault = process.env.ENABLE_AUTO_REBALANCING; // if absent, default to on
  const shouldStart = envDefault === undefined ? true : envDefault === 'true';
  if (shouldStart) {
    scheduler.start();
    fastify.log.info('AI-powered auto-rebalancing scheduler started');
  } else {
    fastify.log.info('Scheduler is disabled by settings');
  }

  // Bootstrap: use AI to ensure a fresh recommendation exists for each vault
  try {
    const hours = Config.recommendationRefreshHours;
    const vaults = (process.env.VAULT_ADDRESSES || '')
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);

    if (!Config.aiEnabled) {
      fastify.log.warn('AI disabled (no ANTHROPIC_API_KEY). Skipping AI bootstrap.');
    } else if (vaults.length > 0) {
      const { Repository } = await import('./services/db/Repository.js');
      const { VaultService } = await import('./services/VaultService.js');
      const agent = new InvestmentAgent(new VaultService());
      fastify.log.info(`Bootstrapping AI recommendations for ${vaults.length} vault(s) (TTL ${hours}h)`);
      for (const v of vaults) {
        try {
          const latest = await Repository.getLatestAgentDecision(v);
          const isFresh = latest?.createdAt ? ((Date.now() - new Date(latest.createdAt).getTime()) < hours * 3600 * 1000) : false;
          if (!isFresh) {
            fastify.log.info(`Generating AI recommendation for ${v}...`);
            await agent.getOptimalAllocation(v);
            fastify.log.info(`Stored AI recommendation for ${v}`);
          } else {
            fastify.log.info(`Skipping ${v}, recommendation is fresh`);
          }
        } catch (err) {
          fastify.log.error({ err }, `AI bootstrap failed for ${v}`);
        }
      }
    } else {
      fastify.log.info('No vaults configured for bootstrap (VAULT_ADDRESSES empty)');
    }
  } catch (err) {
    fastify.log.error({ err }, 'Bootstrap AI recommendations failed');
  }

  // Register routes
  await fastify.register(tokenRoutes, { prefix: '/api/tokens' });
  await fastify.register(vaultRoutes, { prefix: '/api/vaults' });
  await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });


  // b check with AI system status
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
    return { success: true, message: 'Scheduler stopped' };
  });

  fastify.post('/admin/scheduler/start', async (req, reply) => {
    if (!verifyAdmin(req, reply)) return;
    scheduler.start();
    return { success: true, message: 'Scheduler started' };
  });

  // Start server
  const port = parseInt(process.env.PORT || '8080', 10);
  await fastify.listen({ port, host: '0.0.0.0' });
  fastify.log.info(`Veyra API server running on port ${port}`);
}

// Start server with error handling
start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection, just log it
}); 