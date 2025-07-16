import { z } from 'zod';

/**
 * Common pagination parameters schema
 */
export const paginationSchema = {
  limit: z.coerce.number().int().positive().default(50),
  offset: z.coerce.number().int().min(0).default(0)
};

/**
 * Standard error response schema
 */
export const errorResponseSchema = z.object({
  error: z.string()
});

/**
 * ID response schema (for create operations that return an ID)
 */
export const idResponseSchema = z.object({
  id: z.string().uuid()
});

/**
 * Common date range schema
 */
export const dateRangeSchema = {
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
};

/**
 * Schema for API responses with pagination metadata
 */
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) => 
  z.object({
    data: z.array(itemSchema),
    meta: z.object({
      total: z.number().int().nonnegative(),
      limit: z.number().int().positive(),
      offset: z.number().int().nonnegative(),
      hasMore: z.boolean()
    })
  });

/**
 * Type definition for error responses
 */
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Type definition for ID responses
 */
export type IdResponse = z.infer<typeof idResponseSchema>;

/**
 * Type definition for paginated responses
 */
export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};