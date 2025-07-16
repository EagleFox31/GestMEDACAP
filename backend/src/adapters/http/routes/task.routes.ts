import { FastifyInstance, FastifyRequest } from 'fastify';
import { TaskController } from '../controllers/task.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
  taskResponseSchema,
  TaskQueryParams,
  CreateTaskInput,
  UpdateTaskInput
} from '../schemas/task.schema.js';
import { errorResponseSchema, idResponseSchema } from '../schemas/common.schema.js';

export async function taskRoutes(fastify: FastifyInstance) {
  // Initialize the controller
  const controller = new TaskController();

  // GET /api/tasks - Get all tasks with optional filtering
  fastify.get('/', {
    schema: {
      querystring: taskQuerySchema,
      response: {
        200: {
          type: 'array',
          items: taskResponseSchema
        },
        500: errorResponseSchema
      }
    },
    preHandler: [authenticate]
  }, (request, reply) => controller.findAll(request as FastifyRequest<{ Querystring: TaskQueryParams }>, reply));

  // GET /api/tasks/:id - Get a task by ID
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
        200: taskResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: [authenticate]
  }, (request, reply) => controller.findById(request as FastifyRequest<{ Params: { id: string } }>, reply));

  // POST /api/tasks - Create a new task
  fastify.post('/', {
    schema: {
      body: createTaskSchema,
      response: {
        201: idResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: [
      authenticate,
      authorize(['CP', 'RF', 'DEV', 'STG'])
    ]
  }, (request, reply) => controller.create(request as FastifyRequest<{ Body: CreateTaskInput }>, reply));

  // PUT /api/tasks/:id - Update a task
  fastify.put('/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: updateTaskSchema,
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
  }, (request, reply) => controller.update(request as FastifyRequest<{ Params: { id: string }, Body: UpdateTaskInput }>, reply));

  // DELETE /api/tasks/:id - Delete a task
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
    preHandler: [
      authenticate,
      authorize(['CP', 'RF'])
    ]
  }, (request, reply) => controller.delete(request as FastifyRequest<{ Params: { id: string } }>, reply));
}