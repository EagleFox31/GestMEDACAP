import { FastifyReply, FastifyRequest } from 'fastify';
import * as ExcelJS from 'exceljs';
import { ExportQueryParams } from '../schemas/export.schema.js';
import { Task } from '../../../core/domain/task/Task';
import { SubTask } from '../../../core/domain/task/SubTask';
import { Page } from '../../../core/domain/page/Page';
import { Profile } from '../../../core/domain/profile/Profile';

export class ExportController {
  /**
   * Export project data to Excel format
   */
  async exportToExcel(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    // Cast the query to the expected type
    const query = request.query as unknown as ExportQueryParams;
    try {
      // User must be authenticated
      if (!request.user) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      
      const { entity, phaseCode } = query;
      
      // Get repositories based on the entity type
      let data: any[] = [];
      let headers: { id: string, title: string }[] = [];
      
      switch (entity) {
        case 'tasks':
          data = await this.exportTasks(request, phaseCode);
          headers = [
            { id: 'id', title: 'ID' },
            { id: 'phaseCode', title: 'Phase' },
            { id: 'title', title: 'Title' },
            { id: 'description', title: 'Description' },
            { id: 'priority', title: 'Priority' },
            { id: 'progress', title: 'Progress' },
            { id: 'ownerName', title: 'Owner' },
            { id: 'profiles', title: 'Profiles Impacted' },
            { id: 'createdAt', title: 'Created At' },
            { id: 'plannedStart', title: 'Planned Start' },
            { id: 'plannedEnd', title: 'Planned End' }
          ];
          break;
          
        case 'subtasks':
          data = await this.exportSubtasks(request, phaseCode);
          headers = [
            { id: 'id', title: 'ID' },
            { id: 'taskId', title: 'Task ID' },
            { id: 'taskTitle', title: 'Task Title' },
            { id: 'title', title: 'Subtask Title' },
            { id: 'description', title: 'Description' },
            { id: 'completed', title: 'Completed' },
            { id: 'createdBy', title: 'Created By' },
            { id: 'createdAt', title: 'Created At' }
          ];
          break;
          
        case 'pages':
          data = await this.exportPages(request);
          headers = [
            { id: 'id', title: 'ID' },
            { id: 'title', title: 'Title' },
            { id: 'description', title: 'Description' },
            { id: 'createdBy', title: 'Created By' },
            { id: 'createdAt', title: 'Created At' },
            { id: 'updatedAt', title: 'Updated At' }
          ];
          break;
          
        default:
          return reply.status(400).send({ error: `Unsupported entity type: ${entity}` });
      }
      
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'MEDACAP Project Manager';
      workbook.lastModifiedBy = request.user?.uuid || 'System';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // Add a worksheet
      const worksheet = workbook.addWorksheet(entity);
      
      // Add headers with styling
      worksheet.columns = headers.map(header => ({
        header: header.title,
        key: header.id,
        width: 15
      }));
      
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Add data rows
      worksheet.addRows(data);
      
      // Apply merge cells for Phase/Profile if applicable
      if (entity === 'tasks') {
        // Group by phase and apply merge
        let lastPhase = '';
        let phaseStartRow = 2;
        
        for (let i = 0; i < data.length; i++) {
          const row = i + 2; // +2 because row 1 is header
          const currentPhase = data[i].phaseCode;
          
          if (currentPhase !== lastPhase) {
            // Merge previous phase cells if needed
            if (i > 0 && row - phaseStartRow > 1) {
              worksheet.mergeCells(`A${phaseStartRow}:A${row-1}`);
            }
            
            // Start new phase
            lastPhase = currentPhase;
            phaseStartRow = row;
          }
          
          // Apply conditional formatting for progress column
          const progressCell = worksheet.getCell(`H${row}`);
          const progressValue = parseInt(data[i].progress);
          
          if (progressValue < 30) {
            progressCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6666' } }; // Red
          } else if (progressValue < 70) {
            progressCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC66' } }; // Yellow
          } else {
            progressCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF66FF66' } }; // Green
          }
        }
        
        // Merge last phase if needed
        if (data.length > 0 && data.length + 2 - phaseStartRow > 1) {
          worksheet.mergeCells(`A${phaseStartRow}:A${data.length+1}`);
        }
      }
      
      // Set content type and headers for Excel file download
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="${entity}-${new Date().toISOString().split('T')[0]}.xlsx"`);
      
      // Write to response
      return workbook.xlsx.write(reply.raw);
    } catch (error) {
      request.log.error(error, 'Excel export failed');
      return reply.status(500).send({ error: 'Failed to export data to Excel' });
    }
  }
  
  /**
   * Export tasks data
   */
  private async exportTasks(request: FastifyRequest, phaseCode?: string): Promise<any[]> {
    const taskRepository = request.container.resolve('taskRepository');
    const profileRepository = request.container.resolve('profileRepository');
    
    // Get tasks with optional phase filter
    const tasks = await taskRepository.findAll({
      phaseCode,
      limit: 1000 // Larger limit for exports
    });
    
    // Format tasks for CSV export
    return Promise.all(tasks.map(async (task: Task) => {
      // Get profiles impacted
      const profiles = await profileRepository.findByTaskId(task.getId());
      const profileCodes = profiles.map((p: Profile) => p.getCode()).join(', ');
      
      return {
        id: task.getId(),
        phaseCode: task.getPhaseCode(),
        title: task.getTitle(),
        description: task.getDescription() || '',
        priority: task.getPriority(),
        progress: `${task.getProgress()}%`,
        ownerName: task.getOwnerUuid() || 'Unassigned',
        profiles: profileCodes,
        createdAt: task.getCreatedAt().toISOString(),
        plannedStart: task.getPlannedStart()?.toISOString() || '',
        plannedEnd: task.getPlannedEnd()?.toISOString() || ''
      };
    }));
  }
  
  /**
   * Export subtasks data
   */
  private async exportSubtasks(request: FastifyRequest, phaseCode?: string): Promise<any[]> {
    const subtaskRepository = request.container.resolve('subtaskRepository');
    const taskRepository = request.container.resolve('taskRepository');
    
    // Get all tasks for the given phase if specified
    const tasks = phaseCode 
      ? await taskRepository.findAll({ phaseCode })
      : await taskRepository.findAll({});
    
    const taskIds = tasks.map((task: Task) => task.getId());
    const taskMap = new Map(tasks.map((task: Task) => [task.getId(), task]));
    
    // Get subtasks for all tasks in the phase
    const subtasks = await subtaskRepository.findAll({
      taskIds
    });
    
    // Format subtasks for CSV export
    return subtasks.map((subtask: SubTask) => {
      const taskId = subtask.getTaskId();
      const task = taskMap.get(taskId) as Task | undefined;
      
      return {
        id: subtask.getId(),
        taskId: taskId,
        taskTitle: task ? task.getTitle() : 'Unknown Task',
        title: subtask.getTitle(),
        description: subtask.getDescription() || '',
        completed: subtask.isCompleted() ? 'Yes' : 'No',
        createdBy: subtask.getCreatedBy(),
        createdAt: subtask.getCreatedAt().toISOString()
      };
    });
  }
  
  /**
   * Export pages data
   */
  private async exportPages(request: FastifyRequest): Promise<any[]> {
    const pageRepository = request.container.resolve('pageRepository');
    
    // Get all pages
    // Note: Pages are not directly associated with phases, but could be through tasks
    const pages = await pageRepository.findAll({});
    
    // Format pages for CSV export
    return pages.map((page: Page) => {
      return {
        id: page.getId(),
        title: page.getTitle(),
        description: page.getDescription() || '',
        createdBy: page.getCreatedBy(),
        createdAt: page.getCreatedAt().toISOString(),
        updatedAt: page.getUpdatedAt().toISOString()
      };
    });
  }
}