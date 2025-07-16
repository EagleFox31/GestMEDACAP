import { Knex } from 'knex';
import { SubTask, SubTaskDTO } from '../../../../core/domain/task/SubTask';
import { Result } from '../../../../core/domain/shared/Result';
import { SubTaskFilter, SubTaskRepository } from '../../../../ports/db/SubTaskRepository';
import { BaseKnexRepository } from '../BaseKnexRepository';

/**
 * Knex implementation of the SubTask repository
 */
export class SubTaskKnexRepository extends BaseKnexRepository<SubTask, SubTaskDTO> implements SubTaskRepository {
  constructor(db: Knex) {
    super(db, 'subtask');
  }

  /**
   * Find a subtask by its ID
   * @param id SubTask ID
   */
  async findById(id: string): Promise<Result<SubTask, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const record = await this.query().where('id', id).first();
        
        if (!record) {
          return Result.failure<SubTask, Error>(new Error(`SubTask with ID ${id} not found`));
        }
        
        return this.toDomain(record);
      });
      
      return result;
    } catch (error) {
      return Result.failure<SubTask, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Find subtasks with optional filtering
   * @param filter Filter options
   */
  async find(filter?: SubTaskFilter): Promise<Result<SubTask[], Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const query = this.query();
        
        // Apply filters if provided
        if (filter) {
          if (filter.id !== undefined) {
            query.where('id', filter.id);
          }
          
          if (filter.taskId !== undefined) {
            query.where('task_id', filter.taskId);
          }
          
          if (filter.done !== undefined) {
            query.where('completed', filter.done);
          }
          
          if (filter.search) {
            query.where('title', 'ILIKE', `%${filter.search}%`);
          }
          
          // Apply pagination
          if (filter.limit !== undefined) {
            query.limit(filter.limit);
            
            if (filter.offset !== undefined) {
              query.offset(filter.offset);
            }
          }
          
          // Apply sorting
          const sortBy = filter.sortBy || 'id';
          const sortOrder = filter.sortOrder || 'asc';
          
          query.orderBy(sortBy === 'id' ? 'id' : (sortBy === 'title' ? 'title' : 'completed'), sortOrder);
        } else {
          // Default sorting
          query.orderBy('id', 'asc');
        }
        
        const records = await query;
        
        const subtasks: SubTask[] = [];
        
        for (const record of records) {
          const subtaskResult = this.toDomain(record);
          if (subtaskResult.isFailure()) {
            return Result.failure<SubTask[], Error>(subtaskResult.getErrorValue());
          }
          subtasks.push(subtaskResult.getValue());
        }
        
        return Result.success<SubTask[], Error>(subtasks);
      });
      
      return result;
    } catch (error) {
      return Result.failure<SubTask[], Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Find all subtasks for a specific task
   * @param taskId Task ID
   */
  async findByTaskId(taskId: string): Promise<Result<SubTask[], Error>> {
    try {
      return this.find({ taskId });
    } catch (error) {
      return Result.failure<SubTask[], Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Save a new subtask or update an existing one
   * @param subtask SubTask to save
   */
  async save(subtask: SubTask): Promise<Result<SubTask, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const dto = this.toDTO(subtask);
        const now = new Date();
        
        const exists = await this.query().where('id', dto.id).first();
        
        if (exists) {
          // Update existing subtask
          await this.query()
            .where('id', dto.id)
            .update({
              title: dto.title,
              description: dto.description,
              completed: dto.completed,
              updated_at: now
            });
        } else {
          // Insert new subtask
          await this.query().insert({
            id: dto.id,
            task_id: dto.taskId,
            title: dto.title,
            description: dto.description,
            completed: dto.completed,
            created_by: dto.createdBy,
            created_at: now,
            updated_at: now
          });
        }
        
        return this.findById(dto.id);
      });
      
      return result;
    } catch (error) {
      return Result.failure<SubTask, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete a subtask by its ID
   * @param id SubTask ID
   */
  async delete(id: string): Promise<Result<void, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const deleted = await this.query().where('id', id).delete();
        
        if (deleted === 0) {
          return Result.failure<void, Error>(new Error(`SubTask with ID ${id} not found`));
        }
        
        return Result.success<void, Error>(undefined);
      });
      
      return result;
    } catch (error) {
      return Result.failure<void, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete all subtasks for a specific task
   * @param taskId Task ID
   */
  async deleteByTaskId(taskId: string): Promise<Result<void, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        await this.query().where('task_id', taskId).delete();
        return Result.success<void, Error>(undefined);
      });
      
      return result;
    } catch (error) {
      return Result.failure<void, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Toggle the done status of a subtask
   * @param id SubTask ID
   * @param done New done status
   */
  async toggleDone(id: string, done: boolean): Promise<Result<SubTask, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const updated = await this.query()
          .where('id', id)
          .update({
            completed: done,
            updated_at: new Date()
          });
        
        if (updated === 0) {
          return Result.failure<SubTask, Error>(new Error(`SubTask with ID ${id} not found`));
        }
        
        return this.findById(id);
      });
      
      return result;
    } catch (error) {
      return Result.failure<SubTask, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Calculate the progress percentage for a task based on its subtasks
   * @param taskId Task ID
   */
  async calculateTaskProgress(taskId: string): Promise<Result<number, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        // Get the total count of subtasks for the task
        const [{ total }] = await this.query()
          .where('task_id', taskId)
          .count('id as total');
        
        // If there are no subtasks, return 0% progress
        if (Number(total) === 0) {
          return Result.success<number, Error>(0);
        }
        
        // Get the count of completed subtasks
        const [{ completed }] = await this.query()
          .where('task_id', taskId)
          .where('completed', true)
          .count('id as completed');
        
        // Calculate the progress percentage
        const progress = Math.round((Number(completed) / Number(total)) * 100);
        
        return Result.success<number, Error>(progress);
      });
      
      return result;
    } catch (error) {
      return Result.failure<number, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Maps a database record to a SubTask domain entity
   * @param record Database record
   */
  protected toDomain(record: Record<string, any>): Result<SubTask, Error> {
    try {
      return SubTask.create({
        id: record.id,
        taskId: record.task_id,
        title: record.title,
        description: record.description,
        completed: record.done === undefined ? record.completed : record.done,
        createdBy: record.created_by,
        createdAt: record.created_at ? new Date(record.created_at) : undefined,
        updatedAt: record.updated_at ? new Date(record.updated_at) : undefined
      });
    } catch (error) {
      return Result.failure<SubTask, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Maps a SubTask domain entity to a database record
   * @param entity SubTask
   */
  protected toDTO(entity: SubTask): SubTaskDTO {
    return entity.toObject();
  }
}