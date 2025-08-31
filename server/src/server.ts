import Fastify from 'fastify'
import cors from '@fastify/cors'
import dotenv from 'dotenv'
import { protocolRoutes } from './routes/protocols.js'
import { vaultRoutes } from './routes/vaults.js'
import { analyticsRoutes } from './routes/analytics.js'
import { ProtocolMonitor } from './services/ProtocolMonitor.js'

dotenv.config()

const start = async () => {
  const fastify = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty'
      }
    }
  })

  try {
    // Register CORS
    await fastify.register(cors, {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000'
    })

    // Register routes
    await fastify.register(protocolRoutes, { prefix: '/api/protocols' })
    await fastify.register(vaultRoutes, { prefix: '/api/vaults' })
    await fastify.register(analyticsRoutes, { prefix: '/api/analytics' })

    // Health check
    fastify.get('/health', async () => {
      return { status: 'operational', timestamp: new Date().toISOString() }
    })

    // Initialize protocol monitoring
    const monitor = new ProtocolMonitor()
    monitor.startMonitoring()

    // Start server
    const port = parseInt(process.env.PORT || '8080', 10)
    await fastify.listen({ 
      port,
      host: '0.0.0.0'
    })
    
    fastify.log.info('Veyra API server running')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()