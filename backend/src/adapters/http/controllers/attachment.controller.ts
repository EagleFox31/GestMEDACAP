import { FastifyReply, FastifyRequest } from 'fastify';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { Attachment } from '../../../core/domain/attachment/Attachment';
import {
  AttachmentQueryParams,
  UploadAttachmentInput
} from '../schemas/attachment.schema.js';

// Helper for pipeline streams
const pump = promisify(pipeline);

// Define interfaces for objects used in the controller
interface AttachmentEntity {
  getId(): string;
  getTaskId(): string;
  getFilename(): string;
  getOriginalName(): string;
  getMimeType(): string;
  getSize(): number;
  getUploadedBy(): string;
  getUploadedAt(): Date;
}

export class AttachmentController {
  /**
   * Get all attachments with optional filtering
   */
  async findAll(
    request: FastifyRequest<{ Querystring: AttachmentQueryParams }>, 
    reply: FastifyReply
  ) {
    try {
      // Get the attachment repository from the container
      const attachmentRepository = request.container.resolve('attachmentRepository');
      
      const { taskId, mimeType, q, limit = 50, offset = 0 } = request.query;
      
      // Get attachments with optional filters
      const attachments = await attachmentRepository.findAll({ 
        taskId,
        mimeType,
        searchTerm: q,
        limit, 
        offset 
      });
      
      // Map to response format
      const responseData = attachments.map((attachment: AttachmentEntity) => ({
        id: attachment.getId(),
        taskId: attachment.getTaskId(),
        filename: attachment.getFilename(),
        originalName: attachment.getOriginalName(),
        mimeType: attachment.getMimeType(),
        size: attachment.getSize(),
        uploadedBy: attachment.getUploadedBy(),
        uploadedAt: attachment.getUploadedAt().toISOString(),
        downloadUrl: `/api/attachments/${attachment.getId()}/download`
      }));
      
      return reply.status(200).send(responseData);
    } catch (error) {
      request.log.error(error, 'Failed to get attachments');
      return reply.status(500).send({ error: 'Failed to get attachments' });
    }
  }
  
  /**
   * Get attachment details by ID
   */
  async findById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    
    try {
      // Get the attachment repository from the container
      const attachmentRepository = request.container.resolve('attachmentRepository');
      
      // Get the attachment by ID
      const attachment = await attachmentRepository.findById(id);
      
      if (!attachment) {
        return reply.status(404).send({ error: `Attachment with ID ${id} not found` });
      }
      
      // Map to response format
      const responseData = {
        id: attachment.getId(),
        taskId: attachment.getTaskId(),
        filename: attachment.getFilename(),
        originalName: attachment.getOriginalName(),
        mimeType: attachment.getMimeType(),
        size: attachment.getSize(),
        uploadedBy: attachment.getUploadedBy(),
        uploadedAt: attachment.getUploadedAt().toISOString(),
        downloadUrl: `/api/attachments/${attachment.getId()}/download`
      };
      
      return reply.status(200).send(responseData);
    } catch (error) {
      request.log.error(error, 'Failed to get attachment');
      return reply.status(500).send({ error: 'Failed to get attachment' });
    }
  }
  
  /**
   * Upload a new attachment
   */
  async upload(request: FastifyRequest<{ Body: UploadAttachmentInput }>, reply: FastifyReply) {
    try {
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      
      // Verify that the file was uploaded
      const file = await request.file();
      
      if (!file) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }
      
      const { taskId } = request.body;
      
      // Get the task repository from the container to check if task exists
      const taskRepository = request.container.resolve('taskRepository');
      const task = await taskRepository.findById(taskId);
      
      if (!task) {
        return reply.status(404).send({ error: `Task with ID ${taskId} not found` });
      }
      
      // Check if user has permission to add attachments to this task
      // CP and RF can always add, task owner can add, and RACI R/A can add
      const userUuid = request.user.uuid;
      const userRole = request.user.role;
      
      const isAdmin = ['CP', 'RF'].includes(userRole);
      const isOwner = task.getOwnerUuid() === userUuid;
      
      if (!isAdmin && !isOwner) {
        // Check RACI permissions
        const raciRepository = request.container.resolve('raciRepository');
        const raciEntry = await raciRepository.findByTaskAndUser(taskId, userUuid);
        
        if (!raciEntry || !['R', 'A'].includes(raciEntry.letter)) {
          return reply.status(403).send({ 
            error: `Forbidden - user cannot add attachments to task ${taskId} (needs R or A)` 
          });
        }
      }
      
      // Get the attachment store from the container
      const attachmentStore = request.container.resolve('attachmentStore');
      
      // Upload the file to storage
      const fileId = await attachmentStore.saveFile(file.file, file.filename);
      
      // Create a new attachment entity
      const attachmentResult = Attachment.create({
        taskId,
        filename: fileId,
        originalName: file.filename,
        mimeType: file.mimetype,
        size: file.file.bytesRead,
        uploadedBy: request.user.uuid
      });
      
      if (attachmentResult.isFailure()) {
        // Delete the file if the attachment entity creation fails
        await attachmentStore.deleteFile(fileId);
        return reply.status(400).send({ error: attachmentResult.getErrorValue().message });
      }
      
      // Save the attachment to the repository
      const attachmentRepository = request.container.resolve('attachmentRepository');
      const savedAttachment = await attachmentRepository.save(attachmentResult.getValue());
      
      // Notify via WebSocket (if available)
      const realtimeBroker = request.container.resolve('realtimeBroker');
      if (realtimeBroker) {
        realtimeBroker.emit('attachment:new', { 
          id: savedAttachment.getId(),
          taskId
        });
      }
      
      return reply.status(201).send({ 
        id: savedAttachment.getId(),
        filename: savedAttachment.getOriginalName()
      });
    } catch (error) {
      request.log.error(error, 'Failed to upload attachment');
      return reply.status(500).send({ error: 'Failed to upload attachment' });
    }
  }
  
  /**
   * Download an attachment file
   */
  async download(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    
    try {
      // Get the attachment repository from the container
      const attachmentRepository = request.container.resolve('attachmentRepository');
      
      // Get the attachment by ID
      const attachment = await attachmentRepository.findById(id);
      
      if (!attachment) {
        return reply.status(404).send({ error: `Attachment with ID ${id} not found` });
      }
      
      // If the attachment exists, get the file from storage
      const attachmentStore = request.container.resolve('attachmentStore');
      const fileStream = await attachmentStore.getFileStream(attachment.getFilename());
      
      if (!fileStream) {
        return reply.status(404).send({ error: `File not found in storage` });
      }
      
      // Set appropriate headers for file download
      reply.header('Content-Disposition', `attachment; filename="${attachment.getOriginalName()}"`);
      reply.header('Content-Type', attachment.getMimeType());
      reply.header('Content-Length', attachment.getSize());
      
      // Stream the file to the response
      return reply.send(fileStream);
    } catch (error) {
      request.log.error(error, 'Failed to download attachment');
      return reply.status(500).send({ error: 'Failed to download attachment' });
    }
  }
  
  /**
   * Delete an attachment
   */
  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    
    try {
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      
      // Get the attachment repository from the container
      const attachmentRepository = request.container.resolve('attachmentRepository');
      
      // Get the attachment by ID
      const attachment = await attachmentRepository.findById(id);
      
      if (!attachment) {
        return reply.status(404).send({ error: `Attachment with ID ${id} not found` });
      }
      
      // Get the task to check permissions
      const taskRepository = request.container.resolve('taskRepository');
      const task = await taskRepository.findById(attachment.getTaskId());
      
      if (!task) {
        return reply.status(404).send({ error: `Parent task not found` });
      }
      
      // Check if user has permission to delete this attachment
      const userUuid = request.user.uuid;
      const userRole = request.user.role;
      
      const isAdmin = ['CP', 'RF'].includes(userRole);
      const isOwner = task.getOwnerUuid() === userUuid;
      const isUploader = attachment.getUploadedBy() === userUuid;
      
      if (!isAdmin && !isOwner && !isUploader) {
        // Check RACI permissions
        const raciRepository = request.container.resolve('raciRepository');
        const raciEntry = await raciRepository.findByTaskAndUser(attachment.getTaskId(), userUuid);
        
        if (!raciEntry || !['R', 'A'].includes(raciEntry.letter)) {
          return reply.status(403).send({ 
            error: `Forbidden - user cannot delete attachment ${id} (needs R or A)` 
          });
        }
      }
      
      // Store the taskId for notification after deletion
      const taskId = attachment.getTaskId();
      const filename = attachment.getFilename();
      
      // Delete the attachment from the repository
      await attachmentRepository.delete(id);
      
      // Delete the file from storage
      const attachmentStore = request.container.resolve('attachmentStore');
      await attachmentStore.deleteFile(filename);
      
      // Notify via WebSocket (if available)
      const realtimeBroker = request.container.resolve('realtimeBroker');
      if (realtimeBroker) {
        realtimeBroker.emit('attachment:delete', { 
          id,
          taskId
        });
      }
      
      return reply.status(204).send();
    } catch (error) {
      request.log.error(error, 'Failed to delete attachment');
      return reply.status(500).send({ error: 'Failed to delete attachment' });
    }
  }
}