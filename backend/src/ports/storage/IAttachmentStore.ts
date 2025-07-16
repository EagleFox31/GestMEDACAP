import { Readable } from 'stream';
import { Result } from '../../core/domain/shared/Result';

/**
 * Interface for attachment storage
 */
export interface IAttachmentStore {
  /**
   * Store an image file (PNG/JPG)
   * @param taskId Task ID
   * @param fileName Original file name
   * @param buffer File buffer
   * @param mimeType File MIME type
   */
  storeImage(
    taskId: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<Result<StoredFile, Error>>;

  /**
   * Store a JSON file (Fabric.js canvas data)
   * @param taskId Task ID
   * @param fileName Original file name
   * @param jsonData JSON data as string or object
   */
  storeJson(
    taskId: string,
    fileName: string,
    jsonData: string | object
  ): Promise<Result<StoredFile, Error>>;

  /**
   * Get an image file
   * @param filePath File path
   */
  getImage(filePath: string): Promise<Result<FileData, Error>>;

  /**
   * Get a JSON file
   * @param filePath File path
   */
  getJson(filePath: string): Promise<Result<JsonData, Error>>;

  /**
   * Delete a file
   * @param filePath File path
   */
  deleteFile(filePath: string): Promise<Result<void, Error>>;

  /**
   * Delete all files for a task
   * @param taskId Task ID
   */
  deleteTaskFiles(taskId: string): Promise<Result<void, Error>>;

  /**
   * Create a readable stream for a file
   * @param filePath File path
   */
  createReadStream(filePath: string): Promise<Result<Readable, Error>>;

  /**
   * Check if a file exists
   * @param filePath File path
   */
  fileExists(filePath: string): Promise<Result<boolean, Error>>;

  /**
   * Get file size
   * @param filePath File path
   */
  getFileSize(filePath: string): Promise<Result<number, Error>>;
}

/**
 * Stored file information
 */
export interface StoredFile {
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * File data with buffer
 */
export interface FileData {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * JSON data
 */
export interface JsonData {
  data: any;
  fileName: string;
  sizeBytes: number;
}