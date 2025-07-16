import { z } from 'zod';

// Basic ID schemas
export const idSchema = z.number().int().positive();
export const uuidSchema = z.string().uuid();
export const phaseCodeSchema = z.string().length(1);

// Pagination schemas
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(50).default(50),
  offset: z.number().int().min(0).default(0),
});

// RACI letter schema
export const raciLetterSchema = z.enum(['R', 'A', 'C', 'I']);

// Date schemas
export const dateSchema = z.string().datetime();

// Profile code schema (validates profile codes)
export const profileCodeSchema = z.enum([
  'TEC', 'MAN', 'DPS', 'DOP', 'DF', 'DG', 'RH', 'AF', 'SA'
]);

// Priority schema (1-5)
export const prioritySchema = z.number().int().min(1).max(5);