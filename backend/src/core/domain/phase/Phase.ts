import { Result } from '../shared/Result';
import { PhaseCode } from '../shared/ValueObjects';

// Interface for Phase creation
export interface PhaseProps {
  code: string;
  name: string;
  position: number;
}

// Phase domain entity
export class Phase {
  private code: PhaseCode;
  private name: string;
  private position: number;

  private constructor(props: PhaseProps) {
    this.code = new PhaseCode(props.code);
    this.name = props.name;
    this.position = props.position;
  }

  // Factory method for creating a Phase entity
  public static create(props: PhaseProps): Result<Phase, Error> {
    try {
      // Validate required properties
      if (!props.name || props.name.trim().length === 0) {
        return Result.failure(new Error('Phase name is required'));
      }

      if (!props.code) {
        return Result.failure(new Error('Phase code is required'));
      }

      // Validate name length
      if (props.name.length > 32) {
        return Result.failure(new Error('Phase name must be less than 32 characters'));
      }

      // Validate position
      if (props.position < 0) {
        return Result.failure(new Error('Position must be a non-negative number'));
      }

      return Result.success(new Phase(props));
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Getters
  public getCode(): string {
    return this.code.getValue();
  }

  public getName(): string {
    return this.name;
  }

  public getPosition(): number {
    return this.position;
  }

  // Setters with validation
  public updateName(name: string): Result<void, Error> {
    if (!name || name.trim().length === 0) {
      return Result.failure(new Error('Phase name is required'));
    }

    if (name.length > 32) {
      return Result.failure(new Error('Phase name must be less than 32 characters'));
    }

    this.name = name;
    return Result.success(undefined);
  }

  public updatePosition(position: number): Result<void, Error> {
    if (position < 0) {
      return Result.failure(new Error('Position must be a non-negative number'));
    }

    this.position = position;
    return Result.success(undefined);
  }

  // Convert to plain object for persistence or DTO
  public toObject(): PhaseDTO {
    return {
      code: this.code.getValue(),
      name: this.name,
      position: this.position,
    };
  }
}

// Data Transfer Object for Phase
export interface PhaseDTO {
  code: string;
  name: string;
  position: number;
}