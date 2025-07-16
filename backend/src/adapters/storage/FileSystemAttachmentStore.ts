import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as util from 'util';
import { Readable } from 'stream';
import { Result } from '../../core/domain/shared/Result';
import {
  IAttachmentStore,
  StoredFile,
  FileData,
  JsonData
} from '../../ports/storage/IAttachmentStore';

// Promisify file system operations
const mkdir = util.promisify(fs.mkdir);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const unlink = util.promisify(fs.unlink);
const stat = util.promisify(fs.stat);

/**
 * File system implementation of the attachment store
 */
export class FileSystemAttachmentStore implements IAttachmentStore {
  private basePath: string;

  /**
   * Create a new file system attachment store
   * @param basePath Base path for storing attachments
   */
  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Store an image file (PNG/JPG)
   * @param taskId Task ID
   * @param fileName Original file name
   * @param buffer File buffer
   * @param mimeType File MIME type
   */
  async storeImage(
    taskId: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<Result<StoredFile, Error>> {
    try {
      // Check if MIME type is for an image
      if (!mimeType.startsWith('image/')) {
        return Result.failure(new Error(`Invalid image MIME type: ${mimeType}`));
      }

      // Generate a unique ID for the attachment
      const id = crypto.randomUUID();
      
      // Create task directory if it doesn't exist
      const taskDir = path.join(this.basePath, taskId);
      try {
        await mkdir(taskDir, { recursive: true });
      } catch (error) {
        // Ignore error if directory already exists
      }
      
      // Generate a safe filename
      const extension = path.extname(fileName);
      const safeFilename = `${id}${extension}`;
      
      // Full path to the file
      const filePath = path.join(taskDir, safeFilename);
      
      // Write the file
      await writeFile(filePath, buffer);
      
      // Get file size
      const stats = await stat(filePath);
      
      // Return the stored file info
      const relativePath = path.join(taskId, safeFilename);
      
      return Result.success({
        filePath: relativePath,
        fileName: fileName,
        mimeType: mimeType,
        sizeBytes: stats.size
      });
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Store a JSON file (Fabric.js canvas data)
   * @param taskId Task ID
   * @param fileName Original file name
   * @param jsonData JSON data as string or object
   */
  async storeJson(
    taskId: string,
    fileName: string,
    jsonData: string | object
  ): Promise<Result<StoredFile, Error>> {
    try {
      // Generate a unique ID for the attachment
      const id = crypto.randomUUID();
      
      // Create task directory if it doesn't exist
      const taskDir = path.join(this.basePath, taskId);
      try {
        await mkdir(taskDir, { recursive: true });
      } catch (error) {
        // Ignore error if directory already exists
      }
      
      // Convert object to string if needed
      const jsonString = typeof jsonData === 'string'
        ? jsonData
        : JSON.stringify(jsonData);
      
      // Generate a safe filename
      const safeFilename = `${id}.json`;
      
      // Full path to the file
      const filePath = path.join(taskDir, safeFilename);
      
      // Write the file
      await writeFile(filePath, jsonString);
      
      // Get file size
      const stats = await stat(filePath);
      
      // Return the stored file info
      const relativePath = path.join(taskId, safeFilename);
      
      return Result.success({
        filePath: relativePath,
        fileName: fileName,
        mimeType: 'application/json',
        sizeBytes: stats.size
      });
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get an image file
   * @param filePath File path
   */
  async getImage(filePath: string): Promise<Result<FileData, Error>> {
    try {
      // Get absolute path
      const absPath = path.join(this.basePath, filePath);
      
      // Check if file exists
      const fileExists = await this.fileExists(filePath);
      if (fileExists.isFailure() || !fileExists.getValue()) {
        return Result.failure(new Error(`File not found: ${filePath}`));
      }
      
      // Read the file
      const buffer = await readFile(absPath);
      
      // Get file stats
      const stats = await stat(absPath);
      
      // Get filename from path
      const fileName = path.basename(filePath);
      
      // Determine MIME type from extension
      const extension = path.extname(fileName).toLowerCase();
      let mimeType = 'application/octet-stream';
      
      if (extension === '.png') {
        mimeType = 'image/png';
      } else if (extension === '.jpg' || extension === '.jpeg') {
        mimeType = 'image/jpeg';
      } else if (extension === '.gif') {
        mimeType = 'image/gif';
      } else if (extension === '.webp') {
        mimeType = 'image/webp';
      }
      
      return Result.success({
        buffer,
        fileName,
        mimeType,
        sizeBytes: stats.size
      });
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get a JSON file
   * @param filePath File path
   */
  async getJson(filePath: string): Promise<Result<JsonData, Error>> {
    try {
      // Get absolute path
      const absPath = path.join(this.basePath, filePath);
      
      // Check if file exists
      const fileExists = await this.fileExists(filePath);
      if (fileExists.isFailure() || !fileExists.getValue()) {
        return Result.failure(new Error(`File not found: ${filePath}`));
      }
      
      // Read the file
      const buffer = await readFile(absPath);
      
      // Parse JSON
      const data = JSON.parse(buffer.toString('utf8'));
      
      // Get file stats
      const stats = await stat(absPath);
      
      // Get filename from path
      const fileName = path.basename(filePath);
      
      return Result.success({
        data,
        fileName,
        sizeBytes: stats.size
      });
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete a file
   * @param filePath File path
   */
  async deleteFile(filePath: string): Promise<Result<void, Error>> {
    try {
      // Get absolute path
      const absPath = path.join(this.basePath, filePath);
      
      // Check if file exists
      const fileExists = await this.fileExists(filePath);
      if (fileExists.isFailure() || !fileExists.getValue()) {
        return Result.failure(new Error(`File not found: ${filePath}`));
      }
      
      // Delete the file
      await unlink(absPath);
      
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete all files for a task
   * @param taskId Task ID
   */
  async deleteTaskFiles(taskId: string): Promise<Result<void, Error>> {
    try {
      // Get the task directory path
      const taskDir = path.join(this.basePath, taskId);
      
      // Check if directory exists
      if (!fs.existsSync(taskDir)) {
        // If directory doesn't exist, nothing to delete
        return Result.success(undefined);
      }
      
      // Delete all files in the directory
      const files = fs.readdirSync(taskDir);
      
      for (const file of files) {
        const filePath = path.join(taskDir, file);
        await unlink(filePath);
      }
      
      // Remove the directory itself
      fs.rmdirSync(taskDir);
      
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Create a readable stream for a file
   * @param filePath File path
   */
  async createReadStream(filePath: string): Promise<Result<Readable, Error>> {
    try {
      // Get absolute path
      const absPath = path.join(this.basePath, filePath);
      
      // Check if file exists
      const fileExists = await this.fileExists(filePath);
      if (fileExists.isFailure() || !fileExists.getValue()) {
        return Result.failure(new Error(`File not found: ${filePath}`));
      }
      
      // Create readable stream
      const stream = fs.createReadStream(absPath);
      
      return Result.success(stream);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check if a file exists
   * @param filePath File path
   */
  async fileExists(filePath: string): Promise<Result<boolean, Error>> {
    try {
      // Get absolute path
      const absPath = path.join(this.basePath, filePath);
      
      // Check if file exists
      const exists = fs.existsSync(absPath);
      
      return Result.success(exists);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get file size
   * @param filePath File path
   */
  async getFileSize(filePath: string): Promise<Result<number, Error>> {
    try {
      // Get absolute path
      const absPath = path.join(this.basePath, filePath);
      
      // Check if file exists
      const fileExists = await this.fileExists(filePath);
      if (fileExists.isFailure() || !fileExists.getValue()) {
        return Result.failure(new Error(`File not found: ${filePath}`));
      }
      
      // Get file stats
      const stats = await stat(absPath);
      
      return Result.success(stats.size);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}