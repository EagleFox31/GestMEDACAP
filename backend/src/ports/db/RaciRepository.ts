import { Result } from "../../core/domain/shared/Result";
import { DbTransaction } from "./TaskRepository";

export type RaciLetter = 'R' | 'A' | 'C' | 'I';

export interface RaciEntry {
  id: string;
  taskId?: number;
  subtaskId?: number;
  userUuid: string;
  letter: RaciLetter;
}

export interface RaciRepository {
  findByTaskId(taskId: number): Promise<Result<RaciEntry[], Error>>;
  findBySubTaskId(subtaskId: number): Promise<Result<RaciEntry[], Error>>;
  findByUserUuid(userUuid: string): Promise<Result<RaciEntry[], Error>>;
  saveTaskRaci(taskId: number, userUuid: string, letter: RaciLetter, trx?: DbTransaction): Promise<Result<void, Error>>;
  saveSubTaskRaci(subtaskId: number, userUuid: string, letter: RaciLetter, trx?: DbTransaction): Promise<Result<void, Error>>;
  deleteAllForTask(taskId: number, trx?: DbTransaction): Promise<Result<void, Error>>;
  deleteAllForSubTask(subtaskId: number, trx?: DbTransaction): Promise<Result<void, Error>>;
  copyFromTaskToSubTask(taskId: number, subtaskId: number, trx?: DbTransaction): Promise<Result<void, Error>>;
}