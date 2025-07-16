import { FastifyReply, FastifyRequest } from 'fastify';
import { Task } from '../../../core/domain/task/Task';
import { Profile } from '../../../core/domain/profile/Profile';
import {
  CreateTaskInput,
  UpdateTaskInput,
  TaskQueryParams,
  TaskResponse
} from '../schemas/task.schema';

// Define interfaces for objects used in the controller
interface RaciEntry {
  taskId: string;
  userUuid: string;
  letter: 'R' | 'A' | 'C' | 'I';
}

interface TaskEntity {
  getId(): string;
  getPhaseCode(): string;
  getPageId(): string | undefined;
  getTitle(): string;
  getDescription(): string | undefined;
  getPriority(): number;
  getOwnerUuid(): string | undefined;
  getProgress(): number;
  getCreatedAt(): Date;
  getUpdatedAt(): Date;
  getPlannedStart(): Date | undefined;
  getPlannedEnd(): Date | undefined;
  updatePhase(phaseCode: string): any;
  updateTitle(title: string): any;
  updateDescription(description: string | undefined): any;
  updatePriority(priority: number): any;
  updateOwner(ownerUuid: string | undefined): any;
  updatePlannedDates(start: Date | undefined, end: Date | undefined): any;
}

export class TaskController {
  /**
   * Get all tasks with optional filtering
   */
  async findAll(request: FastifyRequest<{ Querystring: TaskQueryParams }>, reply: FastifyReply) {
    try {
      // Get the task repository from the container
      const taskRepository = request.container.resolve('taskRepository');
      
      const { phase, ownerUuid, q, limit = 50, offset = 0 } = request.query;
      
      // Get tasks with optional filters
      const tasks = await taskRepository.findAll({ 
        phaseCode: phase, 
        ownerUuid, 
        searchTerm: q, 
        limit, 
        offset 
      });
      
      // Get page repository for page details
      const pageRepository = request.container.resolve('pageRepository');
      
      // Get profile repository for profile details
      const profileRepository = request.container.resolve('profileRepository');
      
      // Get RACI repository for RACI details
      const raciRepository = request.container.resolve('raciRepository');
      
      // Map to response format
      const responseData = await Promise.all(tasks.map(async (task: TaskEntity) => {
        // Get page details if available
        let page = undefined;
        if (task.getPageId()) {
          const pageData = await pageRepository.findById(task.getPageId()!);
          if (pageData) {
            page = {
              id: pageData.getId(),
              title: pageData.getTitle()
            };
          }
        }
        
        // Get owner details if available
        let owner = undefined;
        if (task.getOwnerUuid()) {
          // In a real app, this would fetch from a user repository
          // For now, we just use the UUID as display name
          owner = {
            uuid: task.getOwnerUuid()!,
            displayName: `User ${task.getOwnerUuid()!.substring(0, 8)}`
          };
        }
        
        // Get RACI information
        const raciEntries = await raciRepository.findByTaskId(task.getId());
        const raci = {
          R: raciEntries.filter((r: RaciEntry) => r.letter === 'R').map((r: RaciEntry) => r.userUuid),
          A: raciEntries.filter((r: RaciEntry) => r.letter === 'A').map((r: RaciEntry) => r.userUuid),
          C: raciEntries.filter((r: RaciEntry) => r.letter === 'C').map((r: RaciEntry) => r.userUuid),
          I: raciEntries.filter((r: RaciEntry) => r.letter === 'I').map((r: RaciEntry) => r.userUuid)
        };
        
        // Get profiles impacted
        const profiles = await profileRepository.findByTaskId(task.getId());
        const profileCodes = profiles.map((p: Profile) => p.getCode());
        
        // Build response
        return {
          id: task.getId(),
          phaseCode: task.getPhaseCode(),
          page,
          title: task.getTitle(),
          description: task.getDescription() || null,
          priority: task.getPriority(),
          owner,
          progress: task.getProgress(),
          profilesImpacted: profileCodes,
          raci,
          createdAt: task.getCreatedAt().toISOString(),
          updatedAt: task.getUpdatedAt().toISOString(),
          plannedStart: task.getPlannedStart()?.toISOString() || null,
          plannedEnd: task.getPlannedEnd()?.toISOString() || null
        };
      }));
      
      return reply.status(200).send(responseData);
    } catch (error) {
      request.log.error(error, 'Failed to get tasks');
      return reply.status(500).send({ error: 'Failed to get tasks' });
    }
  }
  
  /**
   * Get a task by ID
   */
  async findById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    
    try {
      // Get the task repository from the container
      const taskRepository = request.container.resolve('taskRepository');
      
      // Get the task by ID
      const task = await taskRepository.findById(id);
      
      if (!task) {
        return reply.status(404).send({ error: `Task with ID ${id} not found` });
      }
      
      // Get page repository for page details
      const pageRepository = request.container.resolve('pageRepository');
      
      // Get profile repository for profile details
      const profileRepository = request.container.resolve('profileRepository');
      
      // Get RACI repository for RACI details
      const raciRepository = request.container.resolve('raciRepository');
      
      // Get page details if available
      let page = undefined;
      if (task.getPageId()) {
        const pageData = await pageRepository.findById(task.getPageId()!);
        if (pageData) {
          page = {
            id: pageData.getId(),
            title: pageData.getTitle()
          };
        }
      }
      
      // Get owner details if available
      let owner = undefined;
      if (task.getOwnerUuid()) {
        // In a real app, this would fetch from a user repository
        // For now, we just use the UUID as display name
        owner = {
          uuid: task.getOwnerUuid()!,
          displayName: `User ${task.getOwnerUuid()!.substring(0, 8)}`
        };
      }
      
      // Get RACI information
      const raciEntries = await raciRepository.findByTaskId(task.getId());
      const raci = {
        R: raciEntries.filter((r: RaciEntry) => r.letter === 'R').map((r: RaciEntry) => r.userUuid),
        A: raciEntries.filter((r: RaciEntry) => r.letter === 'A').map((r: RaciEntry) => r.userUuid),
        C: raciEntries.filter((r: RaciEntry) => r.letter === 'C').map((r: RaciEntry) => r.userUuid),
        I: raciEntries.filter((r: RaciEntry) => r.letter === 'I').map((r: RaciEntry) => r.userUuid)
      };
      
      // Get profiles impacted
      const profiles = await profileRepository.findByTaskId(task.getId());
      const profileCodes = profiles.map((p: Profile) => p.getCode());
      
      // Build response
      const responseData = {
        id: task.getId(),
        phaseCode: task.getPhaseCode(),
        page,
        title: task.getTitle(),
        description: task.getDescription() || null,
        priority: task.getPriority(),
        owner,
        progress: task.getProgress(),
        profilesImpacted: profileCodes,
        raci,
        createdAt: task.getCreatedAt().toISOString(),
        updatedAt: task.getUpdatedAt().toISOString(),
        plannedStart: task.getPlannedStart()?.toISOString() || null,
        plannedEnd: task.getPlannedEnd()?.toISOString() || null
      };
      
      return reply.status(200).send(responseData);
    } catch (error) {
      request.log.error(error, 'Failed to get task');
      return reply.status(500).send({ error: 'Failed to get task' });
    }
  }
  
  /**
   * Create a new task
   */
  async create(request: FastifyRequest<{ Body: CreateTaskInput }>, reply: FastifyReply) {
    try {
      // User must be authenticated and have appropriate role
      if (!request.user || !['CP', 'RF', 'DEV', 'STG'].includes(request.user.role)) {
        return reply.status(403).send({ error: 'Only CP, RF, DEV, or STG can create tasks' });
      }
      
      const { 
        phaseCode, 
        pageId, 
        title, 
        description, 
        priority, 
        profilesImpacted, 
        raci, 
        ownerUuid,
        plannedStart,
        plannedEnd
      } = request.body;
      
      // Get the task repository from the container
      const taskRepository = request.container.resolve('taskRepository');
      
      // Create a new task domain entity
      const taskResult = Task.create({
        phaseCode,
        pageId,
        title,
        description,
        priority,
        ownerUuid,
        progress: 0, // Initial progress is 0
        createdBy: request.user.uuid,
        plannedStart: plannedStart ? new Date(plannedStart) : undefined,
        plannedEnd: plannedEnd ? new Date(plannedEnd) : undefined
      });
      
      if (taskResult.isFailure()) {
        return reply.status(400).send({ error: taskResult.getErrorValue().message });
      }
      
      // Save the task
      const savedTask = await taskRepository.save(taskResult.getValue());
      
      // Associate profiles with the task
      const profileRepository = request.container.resolve('profileRepository');
      await profileRepository.associateWithTask(savedTask.getId(), profilesImpacted);
      
      // Associate RACI entries with the task
      if (raci && raci.length > 0) {
        const raciRepository = request.container.resolve('raciRepository');
        await Promise.all(raci.map(entry => 
          raciRepository.save({
            taskId: savedTask.getId(),
            userUuid: entry.userUuid,
            letter: entry.letter
          })
        ));
      }
      
      // Notify via WebSocket (if available)
      const realtimeBroker = request.container.resolve('realtimeBroker');
      if (realtimeBroker) {
        realtimeBroker.emit('task:new', { id: savedTask.getId() });
      }
      
      return reply.status(201).send({ id: savedTask.getId() });
    } catch (error) {
      request.log.error(error, 'Failed to create task');
      return reply.status(500).send({ error: 'Failed to create task' });
    }
  }
  
  /**
   * Update a task
   */
  async update(request: FastifyRequest<{ Params: { id: string }, Body: UpdateTaskInput }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const updates = request.body;
      
      // Get the task repository from the container
      const taskRepository = request.container.resolve('taskRepository');
      
      // Get the existing task
      const task = await taskRepository.findById(id);
      
      if (!task) {
        return reply.status(404).send({ error: `Task with ID ${id} not found` });
      }
      
      // Check authorization - owner, CP, RF, or RACI R/A can update
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      
      const userUuid = request.user.uuid;
      const userRole = request.user.role;
      
      // CP and RF can update any task
      const isAdmin = ['CP', 'RF'].includes(userRole);
      
      // Owner can update their own task
      const isOwner = task.getOwnerUuid() === userUuid;
      
      // Check RACI permission if not admin or owner
      if (!isAdmin && !isOwner) {
        const raciRepository = request.container.resolve('raciRepository');
        const raciEntry = await raciRepository.findByTaskAndUser(id, userUuid);
        
        if (!raciEntry || !['R', 'A'].includes(raciEntry.letter)) {
          return reply.status(403).send({ 
            error: `Forbidden - user cannot modify task ${id} (needs R or A)` 
          });
        }
      }
      
      // Apply updates
      if (updates.phaseCode) {
        const result = task.updatePhase(updates.phaseCode);
        if (result.isFailure()) {
          return reply.status(400).send({ error: result.getErrorValue().message });
        }
      }
      
      if (updates.title) {
        const result = task.updateTitle(updates.title);
        if (result.isFailure()) {
          return reply.status(400).send({ error: result.getErrorValue().message });
        }
      }
      
      if ('description' in updates) {
        const result = task.updateDescription(updates.description);
        if (result.isFailure()) {
          return reply.status(400).send({ error: result.getErrorValue().message });
        }
      }
      
      if (updates.priority) {
        const result = task.updatePriority(updates.priority);
        if (result.isFailure()) {
          return reply.status(400).send({ error: result.getErrorValue().message });
        }
      }
      
      if ('ownerUuid' in updates) {
        const result = task.updateOwner(updates.ownerUuid);
        if (result.isFailure()) {
          return reply.status(400).send({ error: result.getErrorValue().message });
        }
      }
      
      if (updates.plannedStart || updates.plannedEnd) {
        const plannedStart = updates.plannedStart ? new Date(updates.plannedStart) : task.getPlannedStart();
        const plannedEnd = updates.plannedEnd ? new Date(updates.plannedEnd) : task.getPlannedEnd();
        
        const result = task.updatePlannedDates(plannedStart, plannedEnd);
        if (result.isFailure()) {
          return reply.status(400).send({ error: result.getErrorValue().message });
        }
      }
      
      // Save the updated task
      const updatedTask = await taskRepository.save(task);
      
      // Update profiles if provided
      if (updates.profilesImpacted) {
        const profileRepository = request.container.resolve('profileRepository');
        await profileRepository.removeFromTask(id);
        await profileRepository.associateWithTask(id, updates.profilesImpacted);
      }
      
      // Notify via WebSocket (if available)
      const realtimeBroker = request.container.resolve('realtimeBroker');
      if (realtimeBroker) {
        realtimeBroker.emit('task:update', { id: updatedTask.getId() });
      }
      
      return reply.status(200).send({ id: updatedTask.getId() });
    } catch (error) {
      request.log.error(error, 'Failed to update task');
      return reply.status(500).send({ error: 'Failed to update task' });
    }
  }
  
  /**
   * Delete a task
   */
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      
      // Only CP and RF can delete tasks
      if (!request.user || !['CP', 'RF'].includes(request.user.role)) {
        return reply.status(403).send({ error: 'Only CP or RF can delete tasks' });
      }
      
      // Get the task repository from the container
      const taskRepository = request.container.resolve('taskRepository');
      
      // Check if the task exists
      const task = await taskRepository.findById(id);
      
      if (!task) {
        return reply.status(404).send({ error: `Task with ID ${id} not found` });
      }
      
      // Delete the task
      await taskRepository.delete(id);
      
      // Notify via WebSocket (if available)
      const realtimeBroker = request.container.resolve('realtimeBroker');
      if (realtimeBroker) {
        realtimeBroker.emit('task:delete', { id });
      }
      
      return reply.status(204).send();
    } catch (error) {
      request.log.error(error, 'Failed to delete task');
      return reply.status(500).send({ error: 'Failed to delete task' });
    }
  }
}