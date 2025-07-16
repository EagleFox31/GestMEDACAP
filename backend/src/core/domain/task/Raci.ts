import { Result } from '../shared/Result';
import { RaciLetter, UUID } from '../shared/ValueObjects';

// Interface for RACI creation
export interface RaciProps {
  entityId: string; // Can be taskId or subtaskId
  userUuid: string;
  letter: string; // 'R', 'A', 'C', or 'I'
}

// RACI domain entity
export class Raci {
  private entityId: UUID;
  private userUuid: UUID;
  private letter: RaciLetter;

  private constructor(props: RaciProps) {
    this.entityId = new UUID(props.entityId);
    this.userUuid = new UUID(props.userUuid);
    this.letter = new RaciLetter(props.letter);
  }

  // Factory method for creating a RACI entity
  public static create(props: RaciProps): Result<Raci, Error> {
    try {
      // Validate required properties
      if (!props.entityId) {
        return Result.failure(new Error('Entity ID is required'));
      }

      if (!props.userUuid) {
        return Result.failure(new Error('User UUID is required'));
      }

      if (!props.letter) {
        return Result.failure(new Error('RACI letter is required'));
      }

      return Result.success(new Raci(props));
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Getters
  public getEntityId(): string {
    return this.entityId.getValue();
  }

  public getUserUuid(): string {
    return this.userUuid.getValue();
  }

  public getLetter(): string {
    return this.letter.getValue();
  }

  // Update letter with validation
  public updateLetter(letter: string): Result<void, Error> {
    try {
      this.letter = new RaciLetter(letter);
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Convert to plain object for persistence or DTO
  public toObject(): RaciDTO {
    return {
      entityId: this.entityId.getValue(),
      userUuid: this.userUuid.getValue(),
      letter: this.letter.getValue(),
    };
  }
}

// Data Transfer Object for RACI
export interface RaciDTO {
  entityId: string;
  userUuid: string;
  letter: string;
}

// Task-specific RACI DTO
export interface TaskRaciDTO extends RaciDTO {
  taskId: string;
}

// SubTask-specific RACI DTO
export interface SubTaskRaciDTO extends RaciDTO {
  subtaskId: string;
}