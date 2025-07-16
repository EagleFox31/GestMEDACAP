import { FastifyInstance, FastifyRequest } from 'fastify';
import { AttachmentController } from '../controllers/attachment.controller';
import { authenticate } from '../middlewares/authenticate';
import {
  uploadAttachmentSchema,
  attachmentQuerySchema,
  attachmentResponseSchema,
  attachmentRefSchema,
  AttachmentQueryParams,
  UploadAttachmentInput
} from '../schemas/attachment.schema';
import { errorResponseSchema } from '../schemas/common.schema';

export async function attachmentRoutes(fastify: FastifyInstance) {
  // Initialize the controller
  const controller = new AttachmentController();

  // GET /api/attachments - Get all attachments with optional filtering
  fastify.get('/', {
    schema: {
      querystring: attachmentQuerySchema,
      response: {
        200: {
          type: 'array',
          items: attachmentResponseSchema
        },
        500: errorResponseSchema
      }
    },
    preHandler: [authenticate]
  }, (request, reply) => controller.findAll(request as FastifyRequest<{ Querystring: AttachmentQueryParams }>, reply));

  // GET /api/attachments/:id - Get attachment details by ID
  fastify.get('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: attachmentResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: [authenticate]
  }, (request, reply) => controller.findById(request as FastifyRequest<{ Params: { id: string } }>, reply));

  // POST /api/attachments - Upload a new attachment
  fastify.post('/', {
    schema: {
      body: uploadAttachmentSchema,
      response: {
        201: attachmentRefSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: [authenticate]
  }, (request, reply) => controller.upload(request as FastifyRequest<{ Body: UploadAttachmentInput }>, reply));

  // GET /api/attachments/:id/download - Download an attachment file
  fastify.get('/:id/download', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: [authenticate]
  }, (request, reply) => controller.download(request as FastifyRequest<{ Params: { id: string } }>, reply));

  // DELETE /api/attachments/:id - Delete an attachment
  fastify.delete('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        204: {
          type: 'null'
        },
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: [authenticate]
  }, (request, reply) => controller.delete(request as FastifyRequest<{ Params: { id: string } }>, reply));
}