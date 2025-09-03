import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { vaultRoutes } from './routes/vaults.js';
import { analyticsRoutes } from './routes/analytics.js';
import { SchedulerService } from './services/SchedulerService.js';

// Load environment variables from .env file if it exists
dotenv.config();

/**
 * Veyra API server - AI-powered yield optimization with automated rebalancing
 */
async function start() {
  const fastify = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty'
      }
    }
  });

  // Initialize AI-powered scheduler if enabled
  let scheduler: SchedulerService | null = null;
  if (process.env.ENABLE_AUTO_REBALANCING === 'true') {
    scheduler = new SchedulerService();
    scheduler.start();
    fastify.log.info('AI-powered auto-rebalancing scheduler started');
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
    const schedulerStatus = scheduler ? scheduler.getStatus() : { isRunning: false };
    
    return { 
      status: 'operational', 
      timestamp: new Date().toISOString(),
      ai: aiStatus,
      scheduler: schedulerStatus
    };
  });

  // Scheduler management endpoints
  if (scheduler) {
    fastify.get('/admin/scheduler/status', async () => {
      return { success: true, data: scheduler.getStatus() };
    });

    fastify.post('/admin/scheduler/stop', async () => {
      scheduler.stop();
      return { success: true, message: 'Scheduler stopped' };
    });

    fastify.post('/admin/scheduler/start', async () => {
      scheduler.start();
      return { success: true, message: 'Scheduler started' };
    });
  }

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