import { z } from 'zod';
import { idSchema, phaseCodeSchema } from './common.js';

// Schema for creating a new page
export const createPageSchema = z.object({
  body: z.object({
    phaseCode: phaseCodeSchema,
    title: z.string().min(2).max(200),
    description: z.string().max(2000).optional()
  })
});

// Schema for updating an existing page
export const updatePageSchema = z.object({
  params: z.object({
    id: z.string()
  }),
  body: z.object({
    phaseCode: phaseCodeSchema.optional(),
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(2000).optional().nullable()
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update"
  })
});

// Schema for retrieving a page by ID
export const getPageParamsSchema = z.object({
  params: z.object({
    id: z.string()
  })
});

// Schema for page query parameters (filtering)
export const pageQuerySchema = z.object({
  query: z.object({
    phase: phaseCodeSchema.optional(),
    q: z.string().optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(50)).optional(),
    offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(0)).optional()
  })
});

// Page response schema
export const pageResponseSchema = z.object({
  id: idSchema,
  phaseCode: phaseCodeSchema,
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Types derived from schemas
export type CreatePageInput = z.infer<typeof createPageSchema>['body'];
export type UpdatePageInput = z.infer<typeof updatePageSchema>['body'];
export type PageResponse = z.infer<typeof pageResponseSchema>;
export type PageQueryParams = z.infer<typeof pageQuerySchema>['query'];