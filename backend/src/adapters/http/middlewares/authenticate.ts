import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Authentication middleware to verify if the user is logged in
 * Uses the session cookie to authenticate the user
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const sessionId = request.cookies.sid;

  if (!sessionId) {
    reply.status(401).send({ error: 'Authentication required - session cookie missing' });
    return;
  }

  try {
    // Get the session service from the container
    const sessionService = request.container.resolve('sessionService');
    
    // Verify session and get user with role
    const session = await sessionService.getSessionById(sessionId);
    
    if (!session) {
      reply.status(401).send({ error: 'Authentication required - invalid or expired session' });
      return;
    }
    
    // Attach user and role to the request for use in route handlers
    request.user = {
      uuid: session.userUuid,
      role: session.roleActive,
    };
    
  } catch (error) {
    request.log.error(error, 'Authentication error');
    reply.status(401).send({ error: 'Authentication failed' });
  }
}