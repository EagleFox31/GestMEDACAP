import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { logger } from '../../config/logger';

// Define custom error class for application errors
export class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

// Define custom error class for unauthorized access
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

// Define custom error class for forbidden access
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

// Define custom error class for not found resources
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

// Define custom error class for conflict errors
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

// Error handler function for Fastify
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log the error
  logger.error({
    err: error,
    path: request.url,
    method: request.method,
    reqId: request.id,
  });

  // Handle known error types
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.message,
    });
  }

  // Handle validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation error',
      details: error.format(),
    });
  }

  // Handle JSON parsing errors
  if (error.statusCode === 400 && error.name === 'SyntaxError') {
    return reply.status(400).send({
      error: 'Invalid JSON',
    });
  }

  // Handle 404 errors
  if (error.statusCode === 404) {
    return reply.status(404).send({
      error: 'Resource not found',
    });
  }

  // Handle all other errors
  return reply.status(500).send({
    error: 'Internal Server Error',
  });
}