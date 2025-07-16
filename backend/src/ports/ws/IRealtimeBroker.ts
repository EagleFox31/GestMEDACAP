import { TaskDTO } from '../../core/domain/task/Task';
import { SubTaskDTO } from '../../core/domain/task/SubTask';

/**
 * Interface for real-time communication broker
 */
export interface IRealtimeBroker {
  /**
   * Connect to the real-time broker
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the real-time broker
   */
  disconnect(): Promise<void>;

  /**
   * Join a room to receive updates for a specific project
   * @param projectId Project ID (default: "MEDACAP")
   */
  joinProjectRoom(projectId?: string): void;

  /**
   * Leave a project room
   * @param projectId Project ID (default: "MEDACAP")
   */
  leaveProjectRoom(projectId?: string): void;

  /**
   * Broadcast a task creation event
   * @param task Task data
   * @param projectId Project ID (default: "MEDACAP")
   */
  emitTaskCreated(task: TaskDTO, projectId?: string): void;

  /**
   * Broadcast a task update event
   * @param task Task data
   * @param projectId Project ID (default: "MEDACAP")
   */
  emitTaskUpdated(task: TaskDTO, projectId?: string): void;

  /**
   * Broadcast a task deletion event
   * @param taskId Task ID
   * @param projectId Project ID (default: "MEDACAP")
   */
  emitTaskDeleted(taskId: string, projectId?: string): void;

  /**
   * Broadcast a subtask update event
   * @param subtask SubTask data
   * @param projectId Project ID (default: "MEDACAP")
   */
  emitSubTaskUpdated(subtask: SubTaskDTO, projectId?: string): void;

  /**
   * Broadcast a task lock event
   * @param taskId Task ID
   * @param userInfo User information
   * @param projectId Project ID (default: "MEDACAP")
   */
  emitTaskLocked(
    taskId: string,
    userInfo: { uuid: string; name: string },
    projectId?: string
  ): void;

  /**
   * Broadcast a task unlock event
   * @param taskId Task ID
   * @param projectId Project ID (default: "MEDACAP")
   */
  emitTaskUnlocked(taskId: string, projectId?: string): void;

  /**
   * Add an event listener for a specific event
   * @param event Event name
   * @param listener Event listener function
   */
  on(event: string, listener: (...args: any[]) => void): void;

  /**
   * Remove an event listener
   * @param event Event name
   * @param listener Event listener function
   */
  off(event: string, listener: (...args: any[]) => void): void;
}