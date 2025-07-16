import { FastifyReply, FastifyRequest } from 'fastify';
import { Phase } from '../../../core/domain/phase/Phase';
import { PhaseResponse } from '../schemas/phase.schema.js';

export class PhaseController {
  /**
   * Get all phases
   */
  async findAll(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Get the phase repository from the container
      const phaseRepository = request.container.resolve('phaseRepository');
      
      // Get all phases
      const phases = await phaseRepository.findAll();
      
      // Map to response format
      const responseData: PhaseResponse[] = phases.map((phase: Phase) => ({
        code: phase.getCode(),
        name: phase.getName(),
        position: phase.getPosition(),
        description: null // Phase class doesn't have description
      }));
      
      return reply.status(200).send(responseData);
    } catch (error) {
      request.log.error(error, 'Failed to get phases');
      return reply.status(500).send({ error: 'Failed to get phases' });
    }
  }
  
  /**
   * Get a phase by code
   */
  async findByCode(request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) {
    const { code } = request.params;
    
    try {
      // Get the phase repository from the container
      const phaseRepository = request.container.resolve('phaseRepository');
      
      // Get the phase by code
      const phase = await phaseRepository.findByCode(code);
      
      if (!phase) {
        return reply.status(404).send({ error: `Phase with code ${code} not found` });
      }
      
      // Map to response format
      const responseData: PhaseResponse = {
        code: phase.getCode(),
        name: phase.getName(),
        position: phase.getPosition(),
        description: null // Phase class doesn't have description
      };
      
      return reply.status(200).send(responseData);
    } catch (error) {
      request.log.error(error, 'Failed to get phase');
      return reply.status(500).send({ error: 'Failed to get phase' });
    }
  }
}