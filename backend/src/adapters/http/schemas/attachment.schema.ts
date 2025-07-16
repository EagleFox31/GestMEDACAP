import { z } from 'zod';
import { paginationSchema } from './common.schema.js';

// Query parameters for attachment listing
export const attachmentQuerySchema = z.object({
  ...paginationSchema,
  taskId: z.string().uuid().optional(),
  mimeType: z.string().optional(),
  q: z.string().optional()
});

// Schema for uploading a new attachment
export const uploadAttachmentSchema = z.object({
  taskId: z.string().uuid()
});

// Response schema for attachment data
export const attachmentResponseSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().int().positive(),
  uploadedBy: z.string().uuid(),
  uploadedAt: z.string().datetime(),
  downloadUrl: z.string()
});

// Basic attachment reference
export const attachmentRefSchema = z.object({
  id: z.string().uuid(),
  filename: z.string()
});

// Export type definitions for use in controllers and routes
export type AttachmentQueryParams = z.infer<typeof attachmentQuerySchema>;
export type UploadAttachmentInput = z.infer<typeof uploadAttachmentSchema>;
export type AttachmentResponse = z.infer<typeof attachmentResponseSchema>;
export type AttachmentRef = z.infer<typeof attachmentRefSchema>;