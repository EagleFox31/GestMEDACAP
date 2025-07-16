import { z } from 'zod';

// Available entity types for export
export const exportEntitySchema = z.enum(['tasks', 'subtasks', 'pages']);

// Query parameters for Excel export
export const exportQuerySchema = z.object({
  entity: exportEntitySchema,
  phaseCode: z.string().optional()
});

// Type definition for export query parameters
export type ExportQueryParams = z.infer<typeof exportQuerySchema>;