import { Task, TaskDTO } from '../../core/domain/task/Task';
import { Result } from '../../core/domain/shared/Result';

/**
 * Interface pour le filtrage des tâches
 */
export interface TaskFilter {
  id?: string;
  phaseCode?: string | string[];
  pageId?: string | string[];
  ownerUuid?: string;
  createdBy?: string;
  profileCode?: string | string[];
  search?: string;
  priorityMin?: number;
  priorityMax?: number;
  progressMin?: number;
  progressMax?: number;
  plannedStartFrom?: Date;
  plannedStartTo?: Date;
  plannedEndFrom?: Date;
  plannedEndTo?: Date;
  createdFrom?: Date;
  createdTo?: Date;
  updatedFrom?: Date;
  updatedTo?: Date;
  sortBy?: keyof TaskDTO;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Type pour représenter une transaction de base de données
 */
export type DbTransaction = any;

export interface TaskRepository {
  findById(id: string): Promise<Result<Task, Error>>;
  find(filters?: TaskFilter): Promise<Result<Task[], Error>>;
  save(task: Task, trx?: DbTransaction): Promise<Result<Task, Error>>;
  delete(id: string, trx?: DbTransaction): Promise<Result<void, Error>>;
}