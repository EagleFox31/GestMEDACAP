import { Result } from '../shared/Result';
import { PhaseCode, Priority, UUID } from '../shared/ValueObjects';

// Interface for Task creation
export interface TaskProps {
  id?: string;
  phaseCode: string;
  pageId?: string;
  title: string;
  description?: string;
  priority: number;
  ownerUuid?: string;
  progress: number;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
  plannedStart?: Date;
  plannedEnd?: Date;
}

// Task domain entity
export class Task {
  private id: UUID;
  private phaseCode: PhaseCode;
  private pageId?: string;
  private title: string;
  private description?: string;
  private priority: Priority;
  private ownerUuid?: UUID;
  private progress: number;
  private createdBy: UUID;
  private createdAt: Date;
  private updatedAt: Date;
  private plannedStart?: Date;
  private plannedEnd?: Date;

  private constructor(props: TaskProps) {
    this.id = props.id ? new UUID(props.id) : UUID.create();
    this.phaseCode = new PhaseCode(props.phaseCode);
    this.pageId = props.pageId;
    this.title = props.title;
    this.description = props.description;
    this.priority = new Priority(props.priority);
    this.ownerUuid = props.ownerUuid ? new UUID(props.ownerUuid) : undefined;
    this.progress = props.progress;
    this.createdBy = new UUID(props.createdBy);
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
    this.plannedStart = props.plannedStart;
    this.plannedEnd = props.plannedEnd;
  }

  // Factory method for creating a Task entity
  public static create(props: TaskProps): Result<Task, Error> {
    try {
      // Validate required properties
      if (!props.title || props.title.trim().length === 0) {
        return Result.failure(new Error('Task title is required'));
      }

      if (!props.phaseCode) {
        return Result.failure(new Error('Phase code is required'));
      }

      if (!props.createdBy) {
        return Result.failure(new Error('Creator is required'));
      }

      // Validate priority range
      if (props.priority < 1 || props.priority > 5) {
        return Result.failure(new Error('Priority must be between 1 and 5'));
      }

      // Validate progress range
      if (props.progress < 0 || props.progress > 100) {
        return Result.failure(new Error('Progress must be between 0 and 100'));
      }

      // Validate dates
      if (props.plannedStart && props.plannedEnd && props.plannedStart > props.plannedEnd) {
        return Result.failure(new Error('Planned start date must be before planned end date'));
      }

      return Result.success(new Task(props));
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Getters
  public getId(): string {
    return this.id.getValue();
  }

  public getPhaseCode(): string {
    return this.phaseCode.getValue();
  }

  public getPageId(): string | undefined {
    return this.pageId;
  }

  public getTitle(): string {
    return this.title;
  }

  public getDescription(): string | undefined {
    return this.description;
  }

  public getPriority(): number {
    return this.priority.getValue();
  }

  public getOwnerUuid(): string | undefined {
    return this.ownerUuid?.getValue();
  }

  public getProgress(): number {
    return this.progress;
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

  public getPlannedStart(): Date | undefined {
    return this.plannedStart;
  }

  public getPlannedEnd(): Date | undefined {
    return this.plannedEnd;
  }

  // Setters with validation
  public updatePhase(phaseCode: string): Result<void, Error> {
    try {
      this.phaseCode = new PhaseCode(phaseCode);
      this.updatedAt = new Date();
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  public updateTitle(title: string): Result<void, Error> {
    if (!title || title.trim().length === 0) {
      return Result.failure(new Error('Task title is required'));
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

  public updatePriority(priority: number): Result<void, Error> {
    try {
      this.priority = new Priority(priority);
      this.updatedAt = new Date();
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  public updateOwner(ownerUuid?: string): Result<void, Error> {
    try {
      this.ownerUuid = ownerUuid ? new UUID(ownerUuid) : undefined;
      this.updatedAt = new Date();
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  public updateProgress(progress: number): Result<void, Error> {
    if (progress < 0 || progress > 100) {
      return Result.failure(new Error('Progress must be between 0 and 100'));
    }
    this.progress = progress;
    this.updatedAt = new Date();
    return Result.success(undefined);
  }

  public updatePlannedDates(start?: Date, end?: Date): Result<void, Error> {
    if (start && end && start > end) {
      return Result.failure(new Error('Planned start date must be before planned end date'));
    }
    this.plannedStart = start;
    this.plannedEnd = end;
    this.updatedAt = new Date();
    return Result.success(undefined);
  }

  // Convert to plain object for persistence or DTO
  public toObject(): TaskDTO {
    return {
      id: this.id.getValue(),
      phaseCode: this.phaseCode.getValue(),
      pageId: this.pageId,
      title: this.title,
      description: this.description,
      priority: this.priority.getValue(),
      ownerUuid: this.ownerUuid?.getValue(),
      progress: this.progress,
      createdBy: this.createdBy.getValue(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      plannedStart: this.plannedStart,
      plannedEnd: this.plannedEnd,
    };
  }
}

// Data Transfer Object for Task
export interface TaskDTO {
  id: string;
  phaseCode: string;
  pageId?: string;
  title: string;
  description?: string;
  priority: number;
  ownerUuid?: string;
  progress: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  plannedStart?: Date;
  plannedEnd?: Date;
}