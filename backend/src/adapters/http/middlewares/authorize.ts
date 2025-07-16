import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Middleware to authorize users based on their roles
 * @param allowedRoles Array of roles that are allowed to access the route
 */
export function authorize(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    // Check if user role is allowed
    const userRole = request.user.role;
    if (!allowedRoles.includes(userRole)) {
      return reply.status(403).send({ 
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }
  };
}