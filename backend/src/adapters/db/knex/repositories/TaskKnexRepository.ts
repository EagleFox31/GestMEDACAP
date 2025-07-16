import { Knex } from 'knex';
import { Task, TaskDTO } from '../../../../core/domain/task/Task';
import { Result } from '../../../../core/domain/shared/Result';
import { TaskFilter, TaskRepository } from '../../../../ports/db/TaskRepository';
import { BaseKnexRepository } from '../BaseKnexRepository';

/**
 * Knex implementation of the Task repository
 */
export class TaskKnexRepository extends BaseKnexRepository<Task, TaskDTO> implements TaskRepository {
  constructor(db: Knex) {
    super(db, 'task');
  }

  /**
   * Find a task by its ID
   * @param id Task ID
   */
  async findById(id: string): Promise<Result<Task, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const record = await this.query().where('id', id).first();
        
        if (!record) {
          return Result.failure<Task, Error>(new Error(`Task with ID ${id} not found`));
        }
        
        return this.toDomain(record);
      });
      
      return result;
    } catch (error) {
      return Result.failure<Task, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Find tasks with optional filtering
   * @param filter Filter options
   */
  async find(filter?: TaskFilter): Promise<Result<Task[], Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const query = this.query();
        
        // Apply filters if provided
        if (filter) {
          this.applyFilters(query, filter);
          
          // Apply pagination
          if (filter.limit !== undefined) {
            query.limit(filter.limit);
            
            if (filter.offset !== undefined) {
              query.offset(filter.offset);
            }
          }
          
          // Apply sorting
          if (filter.sortBy) {
            const column = this.mapSortColumnToDb(filter.sortBy);
            const order = filter.sortOrder || 'asc';
            query.orderBy(column, order);
          } else {
            // Default sorting by updated_at desc
            query.orderBy('updated_at', 'desc');
          }
        }
        
        const records = await query;
        
        const tasks: Task[] = [];
        
        for (const record of records) {
          const taskResult = this.toDomain(record);
          if (taskResult.isFailure()) {
            return Result.failure<Task[], Error>(taskResult.getErrorValue());
          }
          tasks.push(taskResult.getValue());
        }
        
        return Result.success<Task[], Error>(tasks);
      });
      
      return result;
    } catch (error) {
      return Result.failure<Task[], Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Count tasks matching the filter
   * @param filter Filter options
   */
  async count(filter?: TaskFilter): Promise<Result<number, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const query = this.query();
        
        // Apply filters if provided
        if (filter) {
          this.applyFilters(query, filter);
        }
        
        const [{ count }] = await query.count('id as count');
        
        return Result.success<number, Error>(Number(count));
      });
      
      return result;
    } catch (error) {
      return Result.failure<number, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Save a new task or update an existing one
   * @param task Task to save
   */
  async save(task: Task, trx?: Knex.Transaction): Promise<Result<Task, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const dto = this.toDTO(task);
        const now = new Date();
        
        // Utiliser la transaction si elle est fournie, sinon utiliser this.query()
        const queryBuilder = trx ? trx(this.tableName) : this.query();
        
        const exists = await queryBuilder.where('id', dto.id).first();
        
        if (exists) {
          // Update existing task
          await queryBuilder
            .where('id', dto.id)
            .update({
              phase_code: dto.phaseCode,
              page_id: dto.pageId,
              title: dto.title,
              description: dto.description,
              priority: dto.priority,
              owner_uuid: dto.ownerUuid,
              progress: dto.progress,
              updated_at: now,
              planned_start: dto.plannedStart,
              planned_end: dto.plannedEnd
            });
        } else {
          // Insert new task
          await queryBuilder.insert({
            id: dto.id,
            phase_code: dto.phaseCode,
            page_id: dto.pageId,
            title: dto.title,
            description: dto.description,
            priority: dto.priority,
            owner_uuid: dto.ownerUuid,
            progress: dto.progress,
            created_by: dto.createdBy,
            created_at: dto.createdAt,
            updated_at: now,
            planned_start: dto.plannedStart,
            planned_end: dto.plannedEnd
          });
        }
        
        // Pour la recherche du task après sauvegarde, nous ne pouvons pas utiliser directement
        // la transaction car findById est une méthode qui crée sa propre requête
        // Donc on passe par une requête directe avec la transaction si disponible
        if (trx) {
          const record = await trx(this.tableName).where('id', dto.id).first();
          if (!record) {
            return Result.failure<Task, Error>(new Error(`Task with ID ${dto.id} not found after save`));
          }
          return this.toDomain(record);
        } else {
          return this.findById(dto.id);
        }
      });
      
      return result;
    } catch (error) {
      return Result.failure<Task, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete a task by its ID
   * @param id Task ID
   */
  async delete(id: string, trx?: Knex.Transaction): Promise<Result<void, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        // Utiliser la transaction si elle est fournie, sinon utiliser this.query()
        const queryBuilder = trx ? trx(this.tableName) : this.query();
        
        const deleted = await queryBuilder.where('id', id).delete();
        
        if (deleted === 0) {
          return Result.failure<void, Error>(new Error(`Task with ID ${id} not found`));
        }
        
        return Result.success<void, Error>(undefined);
      });
      
      return result;
    } catch (error) {
      return Result.failure<void, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete multiple tasks by their IDs
   * @param ids Task IDs
   */
  async deleteMany(ids: string[]): Promise<Result<void, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        if (ids.length === 0) {
          return Result.success<void, Error>(undefined);
        }
        
        await this.query().whereIn('id', ids).delete();
        
        return Result.success<void, Error>(undefined);
      });
      
      return result;
    } catch (error) {
      return Result.failure<void, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Apply filter conditions to a query
   * @param query Knex query builder
   * @param filter Filter options
   */
  private applyFilters(query: Knex.QueryBuilder, filter: TaskFilter): void {
    if (filter.id !== undefined) {
      query.where('id', filter.id);
    }
    
    if (filter.phaseCode !== undefined) {
      if (Array.isArray(filter.phaseCode)) {
        query.whereIn('phase_code', filter.phaseCode);
      } else {
        query.where('phase_code', filter.phaseCode);
      }
    }
    
    if (filter.pageId !== undefined) {
      if (Array.isArray(filter.pageId)) {
        query.whereIn('page_id', filter.pageId);
      } else {
        query.where('page_id', filter.pageId);
      }
    }
    
    if (filter.ownerUuid !== undefined) {
      query.where('owner_uuid', filter.ownerUuid);
    }
    
    if (filter.createdBy !== undefined) {
      query.where('created_by', filter.createdBy);
    }
    
    if (filter.profileCode !== undefined) {
      const subQuery = this.db('task_profile')
        .select('task_id')
        .whereRaw('task_profile.task_id = task.id');
      
      if (Array.isArray(filter.profileCode)) {
        subQuery.whereIn('profile_code', filter.profileCode);
      } else {
        subQuery.where('profile_code', filter.profileCode);
      }
      
      query.whereExists(subQuery);
    }
    
    if (filter.search) {
      query.where(function() {
        this.where('title', 'ILIKE', `%${filter.search}%`)
            .orWhere('description', 'ILIKE', `%${filter.search}%`);
      });
    }
    
    if (filter.priorityMin !== undefined) {
      query.where('priority', '>=', filter.priorityMin);
    }
    
    if (filter.priorityMax !== undefined) {
      query.where('priority', '<=', filter.priorityMax);
    }
    
    if (filter.progressMin !== undefined) {
      query.where('progress', '>=', filter.progressMin);
    }
    
    if (filter.progressMax !== undefined) {
      query.where('progress', '<=', filter.progressMax);
    }
    
    if (filter.plannedStartFrom !== undefined) {
      query.where('planned_start', '>=', filter.plannedStartFrom);
    }
    
    if (filter.plannedStartTo !== undefined) {
      query.where('planned_start', '<=', filter.plannedStartTo);
    }
    
    if (filter.plannedEndFrom !== undefined) {
      query.where('planned_end', '>=', filter.plannedEndFrom);
    }
    
    if (filter.plannedEndTo !== undefined) {
      query.where('planned_end', '<=', filter.plannedEndTo);
    }
    
    if (filter.createdFrom !== undefined) {
      query.where('created_at', '>=', filter.createdFrom);
    }
    
    if (filter.createdTo !== undefined) {
      query.where('created_at', '<=', filter.createdTo);
    }
    
    if (filter.updatedFrom !== undefined) {
      query.where('updated_at', '>=', filter.updatedFrom);
    }
    
    if (filter.updatedTo !== undefined) {
      query.where('updated_at', '<=', filter.updatedTo);
    }
  }

  /**
   * Map a DTO sort column to a database column
   * @param sortBy Sort column from the DTO
   */
  private mapSortColumnToDb(sortBy: keyof TaskDTO): string {
    const columnMap: Record<keyof TaskDTO, string> = {
      id: 'id',
      phaseCode: 'phase_code',
      pageId: 'page_id',
      title: 'title',
      description: 'description',
      priority: 'priority',
      ownerUuid: 'owner_uuid',
      progress: 'progress',
      createdBy: 'created_by',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      plannedStart: 'planned_start',
      plannedEnd: 'planned_end'
    };
    
    return columnMap[sortBy] || 'updated_at';
  }

  /**
   * Maps a database record to a Task domain entity
   * @param record Database record
   */
  protected toDomain(record: Record<string, any>): Result<Task, Error> {
    try {
      return Task.create({
        id: record.id,
        phaseCode: record.phase_code,
        pageId: record.page_id,
        title: record.title,
        description: record.description,
        priority: record.priority,
        ownerUuid: record.owner_uuid,
        progress: record.progress,
        createdBy: record.created_by,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        plannedStart: record.planned_start,
        plannedEnd: record.planned_end
      });
    } catch (error) {
      return Result.failure<Task, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Maps a Task domain entity to a database record
   * @param entity Task
   */
  protected toDTO(entity: Task): TaskDTO {
    return entity.toObject();
  }
}