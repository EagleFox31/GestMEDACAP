import { FastifyInstance } from 'fastify';
import { ExportController } from '../controllers/export.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { exportQuerySchema } from '../schemas/export.schema';
import { errorResponseSchema } from '../schemas/common.schema';

export async function exportRoutes(fastify: FastifyInstance) {
  // Initialize the controller
  const controller = new ExportController();

  // GET /api/export - Export data to CSV format
  fastify.get('/', {
    schema: {
      querystring: exportQuerySchema,
      response: {
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: [
      authenticate,
      authorize(['CP', 'RF', 'DEV']) // Restrict export to these roles
    ],
    handler: async (request, reply) => {
      // Forward to controller method
      return controller.exportToExcel(request, reply);
    }
  });
}