import { Result } from '../shared/Result';
import { UUID } from '../shared/ValueObjects';

// Interface for SubTask creation
export interface SubTaskProps {
  id?: string;
  taskId: string;
  title: string;
  description?: string;
  completed: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// SubTask domain entity
export class SubTask {
  private id: UUID;
  private taskId: UUID;
  private title: string;
  private description?: string;
  private completed: boolean;
  private createdBy: UUID;
  private createdAt: Date;
  private updatedAt: Date;

  private constructor(props: SubTaskProps) {
    this.id = props.id ? new UUID(props.id) : UUID.create();
    this.taskId = new UUID(props.taskId);
    this.title = props.title;
    this.description = props.description;
    this.completed = props.completed;
    this.createdBy = new UUID(props.createdBy);
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  // Factory method for creating a SubTask entity
  public static create(props: SubTaskProps): Result<SubTask, Error> {
    try {
      // Validate required properties
      if (!props.title || props.title.trim().length === 0) {
        return Result.failure(new Error('SubTask title is required'));
      }

      if (!props.taskId) {
        return Result.failure(new Error('Task ID is required'));
      }

      return Result.success(new SubTask(props));
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Getters
  public getId(): string {
    return this.id.getValue();
  }

  public getTaskId(): string {
    return this.taskId.getValue();
  }

  public getTitle(): string {
    return this.title;
  }

  public isCompleted(): boolean {
    return this.completed;
  }
  
  public getDescription(): string | undefined {
    return this.description;
  }
  
  public getCreatedBy(): string {
    return this.createdBy.getValue();
  }
  
  public getCreatedAt(): Date {
    return this.createdAt;
  }
  
  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  // Setters with validation
  public updateTitle(title: string): Result<void, Error> {
    if (!title || title.trim().length === 0) {
      return Result.failure(new Error('SubTask title is required'));
    }
    this.title = title;
    this.updatedAt = new Date();
    return Result.success(undefined);
  }
  
  public updateDescription(description?: string): Result<void, Error> {
    this.description = description;
    this.updatedAt = new Date();
    return Result.success(undefined);
  }

  public markCompleted(): void {
    this.completed = true;
    this.updatedAt = new Date();
  }

  public markIncomplete(): void {
    this.completed = false;
    this.updatedAt = new Date();
  }

  public toggleCompleted(): void {
    this.completed = !this.completed;
    this.updatedAt = new Date();
  }

  // Convert to plain object for persistence or DTO
  public toObject(): SubTaskDTO {
    return {
      id: this.id.getValue(),
      taskId: this.taskId.getValue(),
      title: this.title,
      description: this.description,
      completed: this.completed,
      createdBy: this.createdBy.getValue(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// Data Transfer Object for SubTask
export interface SubTaskDTO {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  completed: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}