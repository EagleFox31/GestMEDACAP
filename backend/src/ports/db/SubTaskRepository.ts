import { SubTask } from '../../core/domain/task/SubTask';
import { Result } from '../../core/domain/shared/Result';

export interface SubTaskRepository {
  /**
   * Find a subtask by its ID
   * @param id SubTask ID
   */
  findById(id: string): Promise<Result<SubTask, Error>>;

  /**
   * Find subtasks with optional filtering
   * @param filter Filter options
   */
  find(filter?: SubTaskFilter): Promise<Result<SubTask[], Error>>;

  /**
   * Find all subtasks for a specific task
   * @param taskId Task ID
   */
  findByTaskId(taskId: string): Promise<Result<SubTask[], Error>>;

  /**
   * Save a new subtask or update an existing one
   * @param subtask SubTask to save
   */
  save(subtask: SubTask): Promise<Result<SubTask, Error>>;

  /**
   * Delete a subtask by its ID
   * @param id SubTask ID
   */
  delete(id: string): Promise<Result<void, Error>>;

  /**
   * Delete all subtasks for a specific task
   * @param taskId Task ID
   */
  deleteByTaskId(taskId: string): Promise<Result<void, Error>>;

  /**
   * Toggle the completed status of a subtask
   * @param id SubTask ID
   * @param completed New completed status
   */
  toggleDone(id: string, completed: boolean): Promise<Result<SubTask, Error>>;

  /**
   * Get the progress percentage for a task based on its subtasks
   * @param taskId Task ID
   */
  calculateTaskProgress(taskId: string): Promise<Result<number, Error>>;
}

/**
 * Filter options for subtask queries
 */
export interface SubTaskFilter {
  id?: string;
  taskId?: string;
  done?: boolean; // Using 'done' for backward compatibility, refers to 'completed' field
  search?: string; // Full-text search query for title
  limit?: number;
  offset?: number;
  sortBy?: 'id' | 'title' | 'completed';
  sortOrder?: 'asc' | 'desc';
}