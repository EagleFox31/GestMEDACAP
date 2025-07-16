import { FastifyReply, FastifyRequest } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../../config/env';
import { CreateSessionInput, SwitchRoleInput } from '../schemas/session.schema.js';

export class SessionController {
  /**
   * Create a new session (login)
   */
  async create(request: FastifyRequest<{ Body: CreateSessionInput }>, reply: FastifyReply) {
    const { name, role } = request.body;
    
    try {
      // Generate a user UUID (in a real app, this would be from a database)
      const userUuid = uuidv4();
      
      // Generate a session ID
      const sid = uuidv4();
      
      // Session expiration (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      // Create the session object
      const session = {
        sid,
        userUuid,
        name,
        role,
        createdAt: new Date(),
        expiresAt
      };
      
      // Store the session in the service
      const sessionService = request.container.resolve('sessionService');
      await sessionService.createSession(session);
      
      // Set the session cookie
      reply.setCookie('sid', sid, {
        path: '/',
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: expiresAt,
      });
      
      // Return the session details
      return reply.status(201).send({
        sid,
        userUuid,
        role,
        name,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      request.log.error(error, 'Failed to create session');
      return reply.status(500).send({ error: 'Failed to create session' });
    }
  }
  
  /**
   * Delete a session (logout)
   */
  async delete(request: FastifyRequest<{ Params: { sid: string } }>, reply: FastifyReply) {
    const { sid } = request.params;
    
    try {
      // Get the session service
      const sessionService = request.container.resolve('sessionService');
      
      // Delete the session
      await sessionService.deleteSession(sid);
      
      // Clear the cookie
      reply.clearCookie('sid', {
        path: '/',
      });
      
      return reply.status(204).send();
    } catch (error) {
      request.log.error(error, 'Failed to delete session');
      return reply.status(500).send({ error: 'Failed to delete session' });
    }
  }
  
  /**
   * Switch to a different role (requires admin password)
   */
  async switchRole(request: FastifyRequest<{ Body: SwitchRoleInput }>, reply: FastifyReply) {
    const { roleCode, adminPassword } = request.body;
    
    try {
      // Verify admin password
      if (adminPassword !== config.ADMIN_PASSWORD) {
        return reply.status(403).send({ error: 'Invalid admin password' });
      }
      
      // User must be authenticated
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      
      // Get the session service
      const sessionService = request.container.resolve('sessionService');
      
      // Get the current session
      const currentSessionId = request.cookies.sid;
      const currentSession = await sessionService.getSessionById(currentSessionId);
      
      if (!currentSession) {
        return reply.status(401).send({ error: 'Invalid session' });
      }
      
      // Generate a new session ID
      const newSid = uuidv4();
      
      // Create the new session object
      const newSession = {
        sid: newSid,
        userUuid: currentSession.userUuid,
        name: currentSession.name,
        role: roleCode,
        createdAt: new Date(),
        expiresAt: currentSession.expiresAt
      };
      
      // Delete the old session
      await sessionService.deleteSession(currentSessionId);
      
      // Store the new session
      await sessionService.createSession(newSession);
      
      // Set the new session cookie
      reply.setCookie('sid', newSid, {
        path: '/',
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(currentSession.expiresAt),
      });
      
      // Return the new session details
      return reply.status(200).send({
        sid: newSid,
        userUuid: currentSession.userUuid,
        role: roleCode,
        name: currentSession.name,
        expiresAt: currentSession.expiresAt
      });
    } catch (error) {
      request.log.error(error, 'Failed to switch role');
      return reply.status(500).send({ error: 'Failed to switch role' });
    }
  }
}