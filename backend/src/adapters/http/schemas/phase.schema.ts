import { z } from 'zod';
import { phaseCodeSchema } from './common.js';

// Schema for retrieving phase list
export const phaseQuerySchema = z.object({
  query: z.object({}).strict()
});

// Phase response schema
export const phaseResponseSchema = z.object({
  code: phaseCodeSchema,
  name: z.string(),
  position: z.number().int().min(0),
  description: z.string().nullable()
});

// Types derived from schemas
export type PhaseResponse = z.infer<typeof phaseResponseSchema>;