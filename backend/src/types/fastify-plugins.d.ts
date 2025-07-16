// Type declarations for Fastify plugins without proper type declarations
// This file complements the types in fastify.d.ts

import { FastifyPluginCallback } from 'fastify';

// Make TypeScript recognize these modules without any errors
declare module '@fastify/cookie' {
  const plugin: FastifyPluginCallback<{
    secret?: string;
    hook?: string;
    parseOptions?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      path?: string;
    };
  }>;
  export default plugin;
}

declare module '@fastify/cors' {
  const plugin: FastifyPluginCallback<{
    origin?: boolean | string | string[] | RegExp | RegExp[] | Function;
    credentials?: boolean;
  }>;
  export default plugin;
}

declare module '@fastify/multipart' {
  const plugin: FastifyPluginCallback<{
    limits?: {
      fileSize?: number;
    };
  }>;
  export default plugin;
}

declare module '@fastify/rate-limit' {
  const plugin: FastifyPluginCallback<{
    max?: number;
    timeWindow?: string | number;
  }>;
  export default plugin;
}