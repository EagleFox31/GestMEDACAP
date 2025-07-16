import type { Knex } from 'knex';
import { Raci } from '../../../../core/domain/task/Raci';
import { Result } from '../../../../core/domain/shared/Result';
import { RaciRepository, RaciEntry, RaciLetter } from '../../../../ports/db/RaciRepository';
import { BaseKnexRepository } from '../BaseKnexRepository';
import { DbTransaction } from '../../../../ports/db/TaskRepository';

/**
 * Knex implementation of the RACI repository
 */
export class RaciKnexRepository extends BaseKnexRepository<Raci, RaciEntry> implements RaciRepository {
  private readonly taskRaciTable: string = 'task_raci';
  private readonly subtaskRaciTable: string = 'subtask_raci';

  constructor(db: Knex) {
    // Using taskRaciTable as the default table for the base repository
    super(db, 'task_raci');
  }

  /**
   * Find RACI assignments for a task
   * @param taskId Task ID
   */
  async findByTaskId(taskId: number): Promise<Result<RaciEntry[], Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const records = await this.db(this.taskRaciTable)
          .where('task_id', taskId)
          .select('*');
        
        const raciEntries: RaciEntry[] = records.map((record: any) => ({
          id: `task-${record.task_id}-${record.user_uuid}`,
          taskId: record.task_id,
          subtaskId: undefined,
          userUuid: record.user_uuid,
          letter: record.letter
        }));
        
        return Result.success<RaciEntry[], Error>(raciEntries);
      });
      
      return result;
    } catch (error) {
      return Result.failure<RaciEntry[], Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Find RACI assignments for a subtask
   * @param subtaskId SubTask ID
   */
  async findBySubTaskId(subtaskId: number): Promise<Result<RaciEntry[], Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const records = await this.db(this.subtaskRaciTable)
          .where('subtask_id', subtaskId)
          .select('*');
        
        const raciEntries: RaciEntry[] = records.map((record: any) => ({
          id: `subtask-${record.subtask_id}-${record.user_uuid}`,
          taskId: undefined,
          subtaskId: record.subtask_id,
          userUuid: record.user_uuid,
          letter: record.letter
        }));
        
        return Result.success<RaciEntry[], Error>(raciEntries);
      });
      
      return result;
    } catch (error) {
      return Result.failure<RaciEntry[], Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Find RACI assignments for a user across all tasks and subtasks
   * @param userUuid User UUID
   */
  async findByUserUuid(userUuid: string): Promise<Result<RaciEntry[], Error>> {
    try {
      const result = await this.executeQuery(async () => {
        // Get task RACIs
        const taskRacis = await this.db(this.taskRaciTable)
          .where('user_uuid', userUuid)
          .select('*');
        
        // Get subtask RACIs
        const subtaskRacis = await this.db(this.subtaskRaciTable)
          .where('user_uuid', userUuid)
          .select('*');
        
        // Combine and map to RaciEntries
        const raciEntries: RaciEntry[] = [
          ...taskRacis.map((record: any) => ({
            id: `task-${record.task_id}-${record.user_uuid}`,
            taskId: record.task_id,
            subtaskId: undefined,
            userUuid: record.user_uuid,
            letter: record.letter
          })),
          ...subtaskRacis.map((record: any) => ({
            id: `subtask-${record.subtask_id}-${record.user_uuid}`,
            taskId: undefined,
            subtaskId: record.subtask_id,
            userUuid: record.user_uuid,
            letter: record.letter
          }))
        ];
        
        return Result.success<RaciEntry[], Error>(raciEntries);
      });
      
      return result;
    } catch (error) {
      return Result.failure<RaciEntry[], Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Save a new RACI assignment for a task
   * @param taskId Task ID
   * @param userUuid User UUID
   * @param letter RACI letter (R, A, C, I)
   * @param trx Optional transaction object
   */
  async saveTaskRaci(taskId: number, userUuid: string, letter: RaciLetter, trx?: DbTransaction): Promise<Result<void, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const queryBuilder = trx ? trx(this.taskRaciTable) : this.db(this.taskRaciTable);
        
        // Check if the RACI assignment already exists
        const existing = await queryBuilder
          .where('task_id', taskId)
          .where('user_uuid', userUuid)
          .first();
        
        if (existing) {
          // Update existing RACI assignment
          await queryBuilder
            .where('task_id', taskId)
            .where('user_uuid', userUuid)
            .update({
              letter,
              updated_at: new Date()
            });
        } else {
          // Insert new RACI assignment
          await queryBuilder.insert({
            task_id: taskId,
            user_uuid: userUuid,
            letter
          });
        }
        
        return Result.success<void, Error>(undefined);
      });
      
      return result;
    } catch (error) {
      return Result.failure<void, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Save a new RACI assignment for a subtask
   * @param subtaskId SubTask ID
   * @param userUuid User UUID
   * @param letter RACI letter (R, A, C, I)
   * @param trx Optional transaction object
   */
  async saveSubTaskRaci(subtaskId: number, userUuid: string, letter: RaciLetter, trx?: DbTransaction): Promise<Result<void, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const queryBuilder = trx ? trx(this.subtaskRaciTable) : this.db(this.subtaskRaciTable);
        
        // Check if the RACI assignment already exists
        const existing = await queryBuilder
          .where('subtask_id', subtaskId)
          .where('user_uuid', userUuid)
          .first();
        
        if (existing) {
          // Update existing RACI assignment
          await queryBuilder
            .where('subtask_id', subtaskId)
            .where('user_uuid', userUuid)
            .update({
              letter,
              updated_at: new Date()
            });
        } else {
          // Insert new RACI assignment
          await queryBuilder.insert({
            subtask_id: subtaskId,
            user_uuid: userUuid,
            letter
          });
        }
        
        return Result.success<void, Error>(undefined);
      });
      
      return result;
    } catch (error) {
      return Result.failure<void, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete all RACI assignments for a task
   * @param taskId Task ID
   * @param trx Optional transaction object
   */
  async deleteAllForTask(taskId: number, trx?: DbTransaction): Promise<Result<void, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const queryBuilder = trx ? trx(this.taskRaciTable) : this.db(this.taskRaciTable);
        
        await queryBuilder
          .where('task_id', taskId)
          .delete();
        
        return Result.success<void, Error>(undefined);
      });
      
      return result;
    } catch (error) {
      return Result.failure<void, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete all RACI assignments for a subtask
   * @param subtaskId SubTask ID
   * @param trx Optional transaction object
   */
  async deleteAllForSubTask(subtaskId: number, trx?: DbTransaction): Promise<Result<void, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const queryBuilder = trx ? trx(this.subtaskRaciTable) : this.db(this.subtaskRaciTable);
        
        await queryBuilder
          .where('subtask_id', subtaskId)
          .delete();
        
        return Result.success<void, Error>(undefined);
      });
      
      return result;
    } catch (error) {
      return Result.failure<void, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Copy RACI assignments from a task to a subtask
   * @param taskId Source task ID
   * @param subtaskId Target subtask ID
   * @param trx Optional transaction object
   */
  async copyFromTaskToSubTask(taskId: number, subtaskId: number, trx?: DbTransaction): Promise<Result<void, Error>> {
    try {
      // If no transaction is provided, create one
      if (!trx) {
        return await this.transaction(async (transaction) => {
          return this.performCopyFromTaskToSubTask(taskId, subtaskId, transaction);
        });
      } else {
        // Use the provided transaction
        return await this.performCopyFromTaskToSubTask(taskId, subtaskId, trx);
      }
    } catch (error) {
      return Result.failure<void, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Helper method to perform the copy operation within a transaction
   */
  private async performCopyFromTaskToSubTask(taskId: number, subtaskId: number, trx: Knex.Transaction): Promise<Result<void, Error>> {
    // Get all RACI assignments for the task
    const taskRacis = await trx(this.taskRaciTable)
      .where('task_id', taskId)
      .select('*');
    
    // Skip if no RACI assignments found
    if (taskRacis.length === 0) {
      return Result.success<void, Error>(undefined);
    }
    
    // Delete existing RACI assignments for the subtask
    await trx(this.subtaskRaciTable)
      .where('subtask_id', subtaskId)
      .delete();
    
    // Insert new RACI assignments for the subtask based on task assignments
    const subtaskRacis = taskRacis.map((raci: any) => ({
      subtask_id: subtaskId,
      user_uuid: raci.user_uuid,
      letter: raci.letter
    }));
    
    if (subtaskRacis.length > 0) {
      await trx(this.subtaskRaciTable).insert(subtaskRacis);
    }
    
    return Result.success<void, Error>(undefined);
  }

  /**
   * Maps a database record to a Raci domain entity
   * @param record Database record
   */
  protected toDomain(record: Record<string, any>): Result<Raci, Error> {
    try {
      const entityId = String(record.task_id || record.subtask_id);
      
      return Raci.create({
        entityId,
        userUuid: record.user_uuid,
        letter: record.letter
      });
    } catch (error) {
      return Result.failure<Raci, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Maps a Raci domain entity to a RaciEntry
   * @param entity Raci
   */
  protected toDTO(entity: Raci): RaciEntry {
    const entityId = entity.getEntityId();
    const userUuid = entity.getUserUuid();
    
    // We don't know if this is a task or subtask from just the entity
    // This would typically need to be enhanced with additional context
    return {
      id: `entity-${entityId}-${userUuid}`,
      taskId: undefined, // Would need context to determine
      subtaskId: undefined, // Would need context to determine
      userUuid: userUuid,
      letter: entity.getLetter() as RaciLetter
    };
  }
}
