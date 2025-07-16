import Fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AwilixContainer } from 'awilix';

import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler } from './infra/plugins/errorHandler.js';
import { metricsPlugin } from './infra/plugins/metrics.js';

// Type augmentation for the container
declare module 'fastify' {
  interface FastifyInstance {
    container: AwilixContainer;
  }
  interface FastifyRequest {
    container: AwilixContainer;
  }
}

/**
 * Build and configure the Fastify server
 * @param container Dependency injection container
 */
export async function buildServer(container: AwilixContainer): Promise<FastifyInstance> {
  // Create Fastify instance with logging
  const server = Fastify({
    logger,
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  // Register plugins
  await server.register(fastifyCors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });

  await server.register(fastifyCookie, {
    secret: config.COOKIE_SECRET,
    hook: 'onRequest',
    parseOptions: {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    },
  });

  await server.register(fastifyMultipart, {
    limits: {
      fileSize: config.MAX_UPLOAD_SIZE,
    },
  });

  await server.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Register custom plugins
  server.setErrorHandler(errorHandler);
  await server.register(metricsPlugin);

  // Inject container into the server instance
  server.decorate('container', container);
    
  // Register a plugin to make the container available in route handlers
  server.addHook('onRequest', async (request) => {
    request.container = container;
  });
    
  // Register all routes through the centralized router
  const { registerRoutes } = await import('./adapters/http/routes/index.js');
  await registerRoutes(server, ''); // No prefix to maintain existing URLs

  // Health check route (also registered in the router, but kept here for backward compatibility)
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return server;
}