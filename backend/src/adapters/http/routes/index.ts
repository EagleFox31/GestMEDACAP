import { FastifyInstance } from 'fastify';
import { taskRoutes } from './task.routes';
import { subtaskRoutes } from './subtask.routes';
import { attachmentRoutes } from './attachment.routes';
import { exportRoutes } from './export.routes';

/**
 * Register all API routes
 * @param fastify Fastify instance
 * @param prefix API prefix (e.g., '/api')
 */
export async function registerRoutes(fastify: FastifyInstance, prefix: string = '/api') {
  // Register the routes with appropriate prefixes
  fastify.register(taskRoutes, { prefix: `${prefix}/tasks` });
  fastify.register(subtaskRoutes, { prefix: `${prefix}/subtasks` });
  fastify.register(attachmentRoutes, { prefix: `${prefix}/attachments` });
  fastify.register(exportRoutes, { prefix: `${prefix}/export` });
  
  // Add additional route groups here
  
  // Add a health check route
  fastify.get(`${prefix}/health`, async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}