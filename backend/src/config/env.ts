import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Define environment schema with validation
const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ADMIN_PASSWORD: z.string().min(8),
  
  // Database
  DB_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('medacap'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  
  // CORS
  CORS_ORIGIN: z.string().default('*'),
  
  // Cookie
  COOKIE_SECRET: z.string().default('medacap-super-secret-key-change-in-production'),
  
  // Upload
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_SIZE: z.coerce.number().default(2048000), // 2MB
  
  // WebSocket
  WS_FALLBACK_POLL: z.coerce.number().default(10),
});

// Parse environment with validation
export const config = envSchema.parse({
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  
  DB_URL: process.env.DB_URL,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  COOKIE_SECRET: process.env.COOKIE_SECRET,
  
  UPLOAD_DIR: process.env.UPLOAD_DIR,
  MAX_UPLOAD_SIZE: process.env.MAX_UPLOAD_SIZE,
  
  WS_FALLBACK_POLL: process.env.WS_FALLBACK_POLL,
});

// Define type for config
export type Config = z.infer<typeof envSchema>;