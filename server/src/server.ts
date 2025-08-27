import Fastify from 'fastify'

const fastify = Fastify({
  logger: true
})

fastify.register(import('@fastify/cors'), {
  origin: true
})

fastify.get('/', async (request, reply) => {
  return { message: 'Hello World!' }
})

fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    fastify.log.info('Server listening on http://localhost:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()