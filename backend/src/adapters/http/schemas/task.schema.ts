import { z } from 'zod';
import { paginationSchema } from './common.schema.js';

// Task priority enum
export const taskPriorityEnum = z.enum(['1', '2', '3', '4', '5']);

// RACI entry schema
const raciEntrySchema = z.object({
  userUuid: z.string().uuid(),
  letter: z.enum(['R', 'A', 'C', 'I'])
});

// Task base schema
const taskCore = {
  phaseCode: z.string().min(1).max(50),
  pageId: z.string().uuid().optional(),
  title: z.string().min(3).max(255),
  description: z.string().max(5000).optional(),
  priority: z.coerce.number().int().min(1).max(5),
  ownerUuid: z.string().uuid().optional(),
  profilesImpacted: z.array(z.string()).optional()
};

// Schema for creating a new task
export const createTaskSchema = z.object({
  ...taskCore,
  raci: z.array(raciEntrySchema).optional(),
  plannedStart: z.string().datetime().optional(),
  plannedEnd: z.string().datetime().optional()
});

// Schema for updating an existing task
export const updateTaskSchema = z.object({
  phaseCode: taskCore.phaseCode.optional(),
  pageId: z.string().uuid().optional().nullable(),
  title: taskCore.title.optional(),
  description: z.string().max(5000).optional().nullable(),
  priority: taskCore.priority.optional(),
  ownerUuid: z.string().uuid().optional().nullable(),
  profilesImpacted: z.array(z.string()).optional(),
  raci: z.array(raciEntrySchema).optional(),
  plannedStart: z.string().datetime().optional().nullable(),
  plannedEnd: z.string().datetime().optional().nullable(),
  progress: z.number().int().min(0).max(100).optional()
});

// Query parameters for task listing
export const taskQuerySchema = z.object({
  ...paginationSchema,
  phase: z.string().optional(),
  ownerUuid: z.string().uuid().optional(),
  q: z.string().optional()
});

// Response schema for page reference in task
const pageRefSchema = z.object({
  id: z.string().uuid(),
  title: z.string()
});

// Response schema for owner reference in task
const ownerRefSchema = z.object({
  uuid: z.string().uuid(),
  displayName: z.string()
});

// Response schema for RACI information
const raciInfoSchema = z.object({
  R: z.array(z.string().uuid()),
  A: z.array(z.string().uuid()),
  C: z.array(z.string().uuid()),
  I: z.array(z.string().uuid())
});

// Response schema for task data
export const taskResponseSchema = z.object({
  id: z.string().uuid(),
  phaseCode: z.string(),
  page: pageRefSchema.optional(),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.number().int(),
  owner: ownerRefSchema.optional(),
  progress: z.number().int(),
  profilesImpacted: z.array(z.string()),
  raci: raciInfoSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  plannedStart: z.string().datetime().nullable(),
  plannedEnd: z.string().datetime().nullable()
});

// Export type definitions for use in controllers and routes
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQueryParams = z.infer<typeof taskQuerySchema>;
export type TaskResponse = z.infer<typeof taskResponseSchema>;