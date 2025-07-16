import { FastifyInstance, FastifyRequest} from 'fastify';
import { SubTaskController } from '../controllers/subtask.controller';
import { authenticate } from '../middlewares/authenticate';
import {
  createSubTaskSchema,
  updateSubTaskSchema,
  subtaskQuerySchema,
  subtaskResponseSchema,
  SubTaskQueryParams,
  CreateSubTaskInput,
  UpdateSubTaskInput
} from '../schemas/subtask.schema';
import { errorResponseSchema, idResponseSchema } from '../schemas/common.schema';

export async function subtaskRoutes(fastify: FastifyInstance) {
  // Initialize the controller
  const controller = new SubTaskController();

  // GET /api/subtasks - Get all subtasks with optional filtering
  fastify.get('/', {
    schema: {
      querystring: subtaskQuerySchema,
      response: {
        200: {
          type: 'array',
          items: subtaskResponseSchema
        },
        500: errorResponseSchema
      }
    },
    preHandler: [authenticate]
  }, (request, reply) => controller.findAll(request as FastifyRequest<{ Querystring: SubTaskQueryParams }>, reply));

  // GET /api/subtasks/:id - Get a subtask by ID
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
        200: subtaskResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: [authenticate]
  }, (request, reply) => controller.findById(request as FastifyRequest<{ Params: { id: string } }>, reply));

  // POST /api/subtasks - Create a new subtask
  fastify.post('/', {
    schema: {
      body: createSubTaskSchema,
      response: {
        201: idResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: [authenticate]
  }, (request, reply) => controller.create(request as FastifyRequest<{ Body: CreateSubTaskInput }>, reply));

  // PUT /api/subtasks/:id - Update a subtask
  fastify.put('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: updateSubTaskSchema,
      response: {
        200: idResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: [authenticate]
  }, (request, reply) => controller.update(request as FastifyRequest<{ Params: { id: string }, Body: UpdateSubTaskInput }>, reply));

  // DELETE /api/subtasks/:id - Delete a subtask
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