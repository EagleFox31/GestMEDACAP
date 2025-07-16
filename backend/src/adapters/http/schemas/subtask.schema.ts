import { z } from 'zod';
import { paginationSchema } from './common.schema.js';

// Subtask base schema
const subtaskCore = {
  title: z.string().min(3).max(255),
  description: z.string().max(2000).optional(),
  completed: z.boolean().optional().default(false)
};

// Schema for creating a new subtask
export const createSubTaskSchema = z.object({
  taskId: z.string().uuid(),
  ...subtaskCore
});

// Schema for updating an existing subtask
export const updateSubTaskSchema = z.object({
  title: subtaskCore.title.optional(),
  description: z.string().max(2000).optional().nullable(),
  completed: z.boolean().optional()
});

// Query parameters for subtask listing
export const subtaskQuerySchema = z.object({
  ...paginationSchema,
  taskId: z.string().uuid().optional(),
  completed: z.enum(['true', 'false']).optional(),
  q: z.string().optional()
});

// Response schema for subtask data
export const subtaskResponseSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  completed: z.boolean(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Export type definitions for use in controllers and routes
export type CreateSubTaskInput = z.infer<typeof createSubTaskSchema>;
export type UpdateSubTaskInput = z.infer<typeof updateSubTaskSchema>;
export type SubTaskQueryParams = z.infer<typeof subtaskQuerySchema>;
export type SubTaskResponse = z.infer<typeof subtaskResponseSchema>;