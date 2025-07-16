import { FastifyReply, FastifyRequest } from 'fastify';
import { SubTask } from '../../../core/domain/task/SubTask';
import { 
  CreateSubTaskInput, 
  UpdateSubTaskInput, 
  SubTaskQueryParams,
  SubTaskResponse 
} from '../schemas/subtask.schema';

// Define interfaces for objects used in the controller
interface SubTaskEntity {
  getId(): string;
  getTaskId(): string;
  getTitle(): string;
  getDescription(): string | undefined;
  isCompleted(): boolean;
  getCreatedBy(): string;
  getCreatedAt(): Date;
  getUpdatedAt(): Date;
  updateTitle(title: string): any;
  updateDescription(description: string | undefined): any;
  markCompleted(): any;
  markIncomplete(): any;
}

export class SubTaskController {
  /**
   * Get all subtasks with optional filtering
   */
  async findAll(
    request: FastifyRequest<{ Querystring: SubTaskQueryParams }>, 
    reply: FastifyReply
  ) {
    try {
      // Get the subtask repository from the container
      const subtaskRepository = request.container.resolve('subtaskRepository');
      
      const { taskId, completed, q, limit = 50, offset = 0 } = request.query;
      
      // Get subtasks with optional filters
      const subtasks = await subtaskRepository.findAll({ 
        taskId,
        completed: completed !== undefined ? completed === 'true' : undefined,
        searchTerm: q,
        limit, 
        offset 
      });
      
      // Map to response format
      const responseData = subtasks.map((subtask: SubTaskEntity) => ({
        id: subtask.getId(),
        taskId: subtask.getTaskId(),
        title: subtask.getTitle(),
        description: subtask.getDescription() || null,
        completed: subtask.isCompleted(),
        createdBy: subtask.getCreatedBy(),
        createdAt: subtask.getCreatedAt().toISOString(),
        updatedAt: subtask.getUpdatedAt().toISOString()
      }));
      
      return reply.status(200).send(responseData);
    } catch (error) {
      request.log.error(error, 'Failed to get subtasks');
      return reply.status(500).send({ error: 'Failed to get subtasks' });
    }
  }
  
  /**
   * Get a subtask by ID
   */
  async findById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    
    try {
      // Get the subtask repository from the container
      const subtaskRepository = request.container.resolve('subtaskRepository');
      
      // Get the subtask by ID
      const subtask = await subtaskRepository.findById(id);
      
      if (!subtask) {
        return reply.status(404).send({ error: `SubTask with ID ${id} not found` });
      }
      
      // Map to response format
      const responseData = {
        id: subtask.getId(),
        taskId: subtask.getTaskId(),
        title: subtask.getTitle(),
        description: subtask.getDescription() || null,
        completed: subtask.isCompleted(),
        createdBy: subtask.getCreatedBy(),
        createdAt: subtask.getCreatedAt().toISOString(),
        updatedAt: subtask.getUpdatedAt().toISOString()
      };
      
      return reply.status(200).send(responseData);
    } catch (error) {
      request.log.error(error, 'Failed to get subtask');
      return reply.status(500).send({ error: 'Failed to get subtask' });
    }
  }
  
  /**
   * Create a new subtask
   */
  async create(request: FastifyRequest<{ Body: CreateSubTaskInput }>, reply: FastifyReply) {
    try {
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      
      const { taskId, title, description, completed } = request.body;
      
      // Get the task repository from the container to check if task exists
      const taskRepository = request.container.resolve('taskRepository');
      const task = await taskRepository.findById(taskId);
      
      if (!task) {
        return reply.status(404).send({ error: `Task with ID ${taskId} not found` });
      }
      
      // Check if user has permission to add subtasks to this task
      // CP and RF can always add, task owner can add, and RACI R/A can add
      const userUuid = request.user.uuid;
      const userRole = request.user.role;
      
      const isAdmin = ['CP', 'RF'].includes(userRole);
      const isOwner = task.getOwnerUuid() === userUuid;
      
      if (!isAdmin && !isOwner) {
        // Check RACI permissions
        const raciRepository = request.container.resolve('raciRepository');
        const raciEntry = await raciRepository.findByTaskAndUser(taskId, userUuid);
        
        if (!raciEntry || !['R', 'A'].includes(raciEntry.letter)) {
          return reply.status(403).send({ 
            error: `Forbidden - user cannot add subtasks to task ${taskId} (needs R or A)` 
          });
        }
      }
      
      // Get the subtask repository from the container
      const subtaskRepository = request.container.resolve('subtaskRepository');
      
      // Create a new subtask domain entity
      const subtaskResult = SubTask.create({
        taskId,
        title,
        description,
        completed: completed ?? false, // Initial completion state is false
        createdBy: request.user.uuid
      });
      
      if (subtaskResult.isFailure()) {
        return reply.status(400).send({ error: subtaskResult.getErrorValue().message });
      }
      
      // Save the subtask
      const savedSubTask = await subtaskRepository.save(subtaskResult.getValue());
      
      // Update task progress if needed
      await this.updateTaskProgress(taskId, request);
      
      // Notify via WebSocket (if available)
      const realtimeBroker = request.container.resolve('realtimeBroker');
      if (realtimeBroker) {
        realtimeBroker.emit('subtask:new', { 
          id: savedSubTask.getId(),
          taskId
        });
      }
      
      return reply.status(201).send({ id: savedSubTask.getId() });
    } catch (error) {
      request.log.error(error, 'Failed to create subtask');
      return reply.status(500).send({ error: 'Failed to create subtask' });
    }
  }
  
  /**
   * Update a subtask
   */
  async update(
    request: FastifyRequest<{ Params: { id: string }, Body: UpdateSubTaskInput }>, 
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      
      // Get the subtask repository from the container
      const subtaskRepository = request.container.resolve('subtaskRepository');
      
      // Get the existing subtask
      const subtask = await subtaskRepository.findById(id);
      
      if (!subtask) {
        return reply.status(404).send({ error: `SubTask with ID ${id} not found` });
      }
      
      // Get the task to check permissions
      const taskRepository = request.container.resolve('taskRepository');
      const task = await taskRepository.findById(subtask.getTaskId());
      
      if (!task) {
        return reply.status(404).send({ error: `Parent task not found` });
      }
      
      // Check if user has permission to update this subtask
      const userUuid = request.user.uuid;
      const userRole = request.user.role;
      
      const isAdmin = ['CP', 'RF'].includes(userRole);
      const isOwner = task.getOwnerUuid() === userUuid;
      const isCreator = subtask.getCreatedBy() === userUuid;
      
      if (!isAdmin && !isOwner && !isCreator) {
        // Check RACI permissions
        const raciRepository = request.container.resolve('raciRepository');
        const raciEntry = await raciRepository.findByTaskAndUser(subtask.getTaskId(), userUuid);
        
        if (!raciEntry || !['R', 'A'].includes(raciEntry.letter)) {
          return reply.status(403).send({ 
            error: `Forbidden - user cannot modify subtask ${id} (needs R or A)` 
          });
        }
      }
      
      // Apply updates
      if (updates.title) {
        const result = subtask.updateTitle(updates.title);
        if (result.isFailure()) {
          return reply.status(400).send({ error: result.getErrorValue().message });
        }
      }
      
      if ('description' in updates) {
        const result = subtask.updateDescription(updates.description);
        if (result.isFailure()) {
          return reply.status(400).send({ error: result.getErrorValue().message });
        }
      }
      
      if ('completed' in updates) {
        if (updates.completed) {
          subtask.markCompleted();
        } else {
          subtask.markIncomplete();
        }
      }
      
      // Save the updated subtask
      const updatedSubTask = await subtaskRepository.save(subtask);
      
      // Update task progress if completion status changed
      if ('completed' in updates) {
        await this.updateTaskProgress(subtask.getTaskId(), request);
      }
      
      // Notify via WebSocket (if available)
      const realtimeBroker = request.container.resolve('realtimeBroker');
      if (realtimeBroker) {
        realtimeBroker.emit('subtask:update', { 
          id: updatedSubTask.getId(),
          taskId: subtask.getTaskId(),
          completed: subtask.isCompleted()
        });
      }
      
      return reply.status(200).send({ id: updatedSubTask.getId() });
    } catch (error) {
      request.log.error(error, 'Failed to update subtask');
      return reply.status(500).send({ error: 'Failed to update subtask' });
    }
  }
  
  /**
   * Delete a subtask
   */
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      
      // Get the subtask repository from the container
      const subtaskRepository = request.container.resolve('subtaskRepository');
      
      // Get the existing subtask
      const subtask = await subtaskRepository.findById(id);
      
      if (!subtask) {
        return reply.status(404).send({ error: `SubTask with ID ${id} not found` });
      }
      
      // Get the task to check permissions
      const taskRepository = request.container.resolve('taskRepository');
      const task = await taskRepository.findById(subtask.getTaskId());
      
      if (!task) {
        return reply.status(404).send({ error: `Parent task not found` });
      }
      
      // Check if user has permission to delete this subtask
      const userUuid = request.user.uuid;
      const userRole = request.user.role;
      
      const isAdmin = ['CP', 'RF'].includes(userRole);
      const isOwner = task.getOwnerUuid() === userUuid;
      const isCreator = subtask.getCreatedBy() === userUuid;
      
      if (!isAdmin && !isOwner && !isCreator) {
        // Check RACI permissions
        const raciRepository = request.container.resolve('raciRepository');
        const raciEntry = await raciRepository.findByTaskAndUser(subtask.getTaskId(), userUuid);
        
        if (!raciEntry || !['R', 'A'].includes(raciEntry.letter)) {
          return reply.status(403).send({ 
            error: `Forbidden - user cannot delete subtask ${id} (needs R or A)` 
          });
        }
      }
      
      // Store the taskId for progress calculation after deletion
      const taskId = subtask.getTaskId();
      
      // Delete the subtask
      await subtaskRepository.delete(id);
      
      // Update task progress after deletion
      await this.updateTaskProgress(taskId, request);
      
      // Notify via WebSocket (if available)
      const realtimeBroker = request.container.resolve('realtimeBroker');
      if (realtimeBroker) {
        realtimeBroker.emit('subtask:delete', { 
          id,
          taskId
        });
      }
      
      return reply.status(204).send();
    } catch (error) {
      request.log.error(error, 'Failed to delete subtask');
      return reply.status(500).send({ error: 'Failed to delete subtask' });
    }
  }
  
  /**
   * Helper method to update task progress based on subtask completion
   */
  private async updateTaskProgress(taskId: string, request: FastifyRequest) {
    const subtaskRepository = request.container.resolve('subtaskRepository');
    const taskRepository = request.container.resolve('taskRepository');
    
    // Get all subtasks for this task
    const allSubtasks = await subtaskRepository.findAll({ taskId });
    
    if (allSubtasks.length === 0) {
      return; // No subtasks, no progress to update
    }
    
    // Calculate completion percentage
    const completedCount = allSubtasks.filter((st: SubTaskEntity) => st.isCompleted()).length;
    const progress = Math.round((completedCount / allSubtasks.length) * 100);
    
    // Get the task
    const task = await taskRepository.findById(taskId);
    
    if (!task) {
      request.log.error(`Task with ID ${taskId} not found when updating progress`);
      return;
    }
    
    // Update progress if different
    if (task.getProgress() !== progress) {
      task.updateProgress(progress);
      await taskRepository.save(task);
      
      // Notify via WebSocket (if available)
      const realtimeBroker = request.container.resolve('realtimeBroker');
      if (realtimeBroker) {
        realtimeBroker.emit('task:progress', { 
          id: taskId,
          progress
        });
      }
    }
  }
}