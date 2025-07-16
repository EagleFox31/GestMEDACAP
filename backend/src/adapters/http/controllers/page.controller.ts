import { FastifyReply, FastifyRequest } from 'fastify';
import { Page } from '../../../core/domain/page/Page';
import { 
  CreatePageInput, 
  UpdatePageInput, 
  PageQueryParams, 
  PageResponse 
} from '../schemas/page.schema';

export class PageController {
  /**
   * Get all pages with optional filtering
   */
  async findAll(request: FastifyRequest<{ Querystring: PageQueryParams }>, reply: FastifyReply) {
    try {
      // Get the page repository from the container
      const pageRepository = request.container.resolve('pageRepository');
      
      const { phase, q, limit = 50, offset = 0 } = request.query;
      
      // Get pages with optional filters
      const pages = await pageRepository.findAll({ phaseCode: phase, searchTerm: q, limit, offset });
      
      // Map to response format
      const responseData: PageResponse[] = pages.map((page: Page) => ({
        id: page.getId(),
        phaseCode: page.getPhaseCode(),
        title: page.getTitle(),
        description: page.getDescription() || null,
        createdAt: page.getCreatedAt().toISOString(),
        updatedAt: page.getUpdatedAt().toISOString()
      }));
      
      return reply.status(200).send(responseData);
    } catch (error) {
      request.log.error(error, 'Failed to get pages');
      return reply.status(500).send({ error: 'Failed to get pages' });
    }
  }
  
  /**
   * Get a page by ID
   */
  async findById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    
    try {
      // Get the page repository from the container
      const pageRepository = request.container.resolve('pageRepository');
      
      // Get the page by ID
      const page = await pageRepository.findById(parseInt(id, 10));
      
      if (!page) {
        return reply.status(404).send({ error: `Page with ID ${id} not found` });
      }
      
      // Map to response format
      const responseData: PageResponse = {
        id: page.getId(),
        phaseCode: page.getPhaseCode(),
        title: page.getTitle(),
        description: page.getDescription() || null,
        createdAt: page.getCreatedAt().toISOString(),
        updatedAt: page.getUpdatedAt().toISOString()
      };
      
      return reply.status(200).send(responseData);
    } catch (error) {
      request.log.error(error, 'Failed to get page');
      return reply.status(500).send({ error: 'Failed to get page' });
    }
  }
  
  /**
   * Create a new page
   */
  async create(request: FastifyRequest<{ Body: CreatePageInput }>, reply: FastifyReply) {
    try {
      // User must be authenticated and have CP role
      if (!request.user || request.user.role !== 'CP') {
        return reply.status(403).send({ error: 'Only CP can create pages' });
      }
      
      const { phaseCode, title, description } = request.body;
      
      // Get the page repository from the container
      const pageRepository = request.container.resolve('pageRepository');
      
      // Create a new page domain entity
      const pageResult = Page.create({
        phaseCode,
        title,
        description,
        createdBy: request.user.uuid
      });
      
      if (pageResult.isFailure()) {
        return reply.status(400).send({ error: pageResult.getErrorValue().message });
      }
      
      // Save the page
      const savedPage = await pageRepository.save(pageResult.getValue());
      
      // Map to response format
      const responseData: PageResponse = {
        id: savedPage.getId(),
        phaseCode: savedPage.getPhaseCode(),
        title: savedPage.getTitle(),
        description: savedPage.getDescription() || null,
        createdAt: savedPage.getCreatedAt().toISOString(),
        updatedAt: savedPage.getUpdatedAt().toISOString()
      };
      
      return reply.status(201).send(responseData);
    } catch (error) {
      request.log.error(error, 'Failed to create page');
      return reply.status(500).send({ error: 'Failed to create page' });
    }
  }
  
  /**
   * Update a page
   */
  async update(request: FastifyRequest<{ Params: { id: string }, Body: UpdatePageInput }>, reply: FastifyReply) {
    try {
      // User must be authenticated and have CP role
      if (!request.user || request.user.role !== 'CP') {
        return reply.status(403).send({ error: 'Only CP can update pages' });
      }
      
      const { id } = request.params;
      const updates = request.body;
      
      // Get the page repository from the container
      const pageRepository = request.container.resolve('pageRepository');
      
      // Get the existing page
      const page = await pageRepository.findById(parseInt(id, 10));
      
      if (!page) {
        return reply.status(404).send({ error: `Page with ID ${id} not found` });
      }
      
      // Apply updates
      if (updates.phaseCode) {
        const result = page.updatePhaseCode(updates.phaseCode);
        if (result.isFailure()) {
          return reply.status(400).send({ error: result.getError().message });
        }
      }
      
      if (updates.title) {
        const result = page.updateTitle(updates.title);
        if (result.isFailure()) {
          return reply.status(400).send({ error: result.getError().message });
        }
      }
      
      if ('description' in updates) {
        const result = page.updateDescription(updates.description);
        if (result.isFailure()) {
          return reply.status(400).send({ error: result.getError().message });
        }
      }
      
      // Save the updated page
      const updatedPage = await pageRepository.save(page);
      
      // Map to response format
      const responseData: PageResponse = {
        id: updatedPage.getId(),
        phaseCode: updatedPage.getPhaseCode(),
        title: updatedPage.getTitle(),
        description: updatedPage.getDescription() || null,
        createdAt: updatedPage.getCreatedAt().toISOString(),
        updatedAt: updatedPage.getUpdatedAt().toISOString()
      };
      
      return reply.status(200).send(responseData);
    } catch (error) {
      request.log.error(error, 'Failed to update page');
      return reply.status(500).send({ error: 'Failed to update page' });
    }
  }
  
  /**
   * Delete a page
   */
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      // User must be authenticated and have CP role
      if (!request.user || request.user.role !== 'CP') {
        return reply.status(403).send({ error: 'Only CP can delete pages' });
      }
      
      const { id } = request.params;
      
      // Get the page repository from the container
      const pageRepository = request.container.resolve('pageRepository');
      
      // Check if the page exists
      const page = await pageRepository.findById(parseInt(id, 10));
      
      if (!page) {
        return reply.status(404).send({ error: `Page with ID ${id} not found` });
      }
      
      // Get the task repository to check if any tasks reference this page
      const taskRepository = request.container.resolve('taskRepository');
      const tasksWithPage = await taskRepository.findByPageId(parseInt(id, 10));
      
      if (tasksWithPage.length > 0) {
        return reply.status(409).send({ 
          error: `Cannot delete page with ID ${id} because it is referenced by ${tasksWithPage.length} tasks` 
        });
      }
      
      // Delete the page
      await pageRepository.delete(parseInt(id, 10));
      
      return reply.status(204).send();
    } catch (error) {
      request.log.error(error, 'Failed to delete page');
      return reply.status(500).send({ error: 'Failed to delete page' });
    }
  }
}