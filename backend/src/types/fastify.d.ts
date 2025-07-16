import { FastifyInstance, FastifyRequest } from 'fastify';
import { AwilixContainer } from 'awilix';

// Define user interface for authenticated requests
interface User {
  uuid: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    container: AwilixContainer;
  }

  interface FastifyRequest {
    container: AwilixContainer;
    user?: User;
    cookies: {
      [key: string]: string;
    };
    params: {
      [key: string]: string;
    };
  }
  
  interface FastifyReply {
    setCookie(
      name: string,
      value: string,
      options?: {
        path?: string;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'strict' | 'lax' | 'none';
        expires?: Date;
      }
    ): FastifyReply;
    
    clearCookie(
      name: string,
      options?: {
        path?: string;
      }
    ): FastifyReply;
  }
}