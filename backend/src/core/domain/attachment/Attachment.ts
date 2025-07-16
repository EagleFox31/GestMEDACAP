import { Result } from '../shared/Result';
import { UUID } from '../shared/ValueObjects';

// Interface for Attachment creation
export interface AttachmentProps {
  id?: string;
  taskId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt?: Date;
}

// Attachment domain entity
export class Attachment {
  private id: UUID;
  private taskId: UUID;
  private filename: string;
  private originalName: string;
  private mimeType: string;
  private size: number;
  private uploadedBy: UUID;
  private uploadedAt: Date;

  private constructor(props: AttachmentProps) {
    this.id = props.id ? new UUID(props.id) : UUID.create();
    this.taskId = new UUID(props.taskId);
    this.filename = props.filename;
    this.originalName = props.originalName;
    this.mimeType = props.mimeType;
    this.size = props.size;
    this.uploadedBy = new UUID(props.uploadedBy);
    this.uploadedAt = props.uploadedAt || new Date();
  }

  // Factory method for creating an Attachment entity
  public static create(props: AttachmentProps): Result<Attachment, Error> {
    try {
      // Validate required properties
      if (!props.taskId) {
        return Result.failure(new Error('Task ID is required'));
      }

      if (!props.filename || props.filename.trim().length === 0) {
        return Result.failure(new Error('Filename is required'));
      }

      if (!props.originalName || props.originalName.trim().length === 0) {
        return Result.failure(new Error('Original name is required'));
      }

      if (!props.mimeType || props.mimeType.trim().length === 0) {
        return Result.failure(new Error('MIME type is required'));
      }

      if (props.size <= 0) {
        return Result.failure(new Error('Size must be greater than 0'));
      }

      if (!props.uploadedBy) {
        return Result.failure(new Error('Uploader information is required'));
      }

      return Result.success(new Attachment(props));
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

  public getFilename(): string {
    return this.filename;
  }

  public getOriginalName(): string {
    return this.originalName;
  }

  public getMimeType(): string {
    return this.mimeType;
  }

  public getSize(): number {
    return this.size;
  }

  public getUploadedBy(): string {
    return this.uploadedBy.getValue();
  }

  public getUploadedAt(): Date {
    return this.uploadedAt;
  }

  // Convert to plain object for persistence or DTO
  public toObject(): AttachmentDTO {
    return {
      id: this.id.getValue(),
      taskId: this.taskId.getValue(),
      filename: this.filename,
      originalName: this.originalName,
      mimeType: this.mimeType,
      size: this.size,
      uploadedBy: this.uploadedBy.getValue(),
      uploadedAt: this.uploadedAt
    };
  }
}

// Data Transfer Object for Attachment
export interface AttachmentDTO {
  id: string;
  taskId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}