import { z } from 'zod';

// Available roles for users
export const roleSchema = z.enum(['CP', 'RF', 'DEV', 'STG', 'UF']);

// Schema for creating a new session
export const createSessionSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    role: roleSchema
  })
});

// Response schema for a session
export const sessionResponseSchema = z.object({
  sid: z.string(),
  userUuid: z.string().uuid(),
  role: roleSchema,
  name: z.string(),
  expiresAt: z.string().datetime()
});

// Schema for switching roles
export const switchRoleSchema = z.object({
  body: z.object({
    roleCode: roleSchema,
    adminPassword: z.string().min(1)
  })
});

// Types derived from schemas
export type CreateSessionInput = z.infer<typeof createSessionSchema>['body'];
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type SwitchRoleInput = z.infer<typeof switchRoleSchema>['body'];