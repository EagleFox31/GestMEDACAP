import { Result } from '../shared/Result';
import { PhaseCode, UUID } from '../shared/ValueObjects';

// Interface for Page creation
export interface PageProps {
  id?: number;
  phaseCode: string;
  title: string;
  description?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Page domain entity
export class Page {
  private id?: number;
  private phaseCode: PhaseCode;
  private title: string;
  private description?: string;
  private createdBy?: UUID;
  private createdAt: Date;
  private updatedAt: Date;

  private constructor(props: PageProps) {
    this.id = props.id;
    this.phaseCode = new PhaseCode(props.phaseCode);
    this.title = props.title;
    this.description = props.description;
    this.createdBy = props.createdBy ? new UUID(props.createdBy) : undefined;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
  }

  // Factory method for creating a Page entity
  public static create(props: PageProps): Result<Page, Error> {
    try {
      // Validate required properties
      if (!props.title || props.title.trim().length === 0) {
        return Result.failure(new Error('Page title is required'));
      }

      if (!props.phaseCode) {
        return Result.failure(new Error('Phase code is required'));
      }

      // Validate title length
      if (props.title.length > 128) {
        return Result.failure(new Error('Page title must be less than 128 characters'));
      }

      return Result.success(new Page(props));
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Getters
  public getId(): number | undefined {
    return this.id;
  }

  public getPhaseCode(): string {
    return this.phaseCode.getValue();
  }

  public getTitle(): string {
    return this.title;
  }

  public getDescription(): string | undefined {
    return this.description;
  }
  
  public getCreatedBy(): string | undefined {
    return this.createdBy?.getValue();
  }
  
  public getCreatedAt(): Date {
    return this.createdAt;
  }
  
  public getUpdatedAt(): Date {
    return this.updatedAt;
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
      return Result.failure(new Error('Page title is required'));
    }

    if (title.length > 128) {
      return Result.failure(new Error('Page title must be less than 128 characters'));
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

  // Convert to plain object for persistence or DTO
  public toObject(): PageDTO {
    return {
      id: this.id,
      phaseCode: this.phaseCode.getValue(),
      title: this.title,
      description: this.description,
      createdBy: this.createdBy?.getValue(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// Data Transfer Object for Page
export interface PageDTO {
  id?: number;
  phaseCode: string;
  title: string;
  description?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}