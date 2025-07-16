import { Task, TaskDTO } from '../domain/task/Task';
import { SubTask, SubTaskDTO } from '../domain/task/SubTask';
import { Result } from '../domain/shared/Result';
import { TaskRepository } from '../../ports/db/TaskRepository';
import { SubTaskRepository } from '../../ports/db/SubTaskRepository';
import { RaciRepository, RaciLetter } from '../../ports/db/RaciRepository';
import { ProfileRepository } from '../../ports/db/ProfileRepository';
import { IRealtimeBroker } from '../../ports/ws/IRealtimeBroker';

/**
 * Interface pour les données d'entrée de création d'une tâche
 */
export interface CreateTaskInput {
  phaseCode: string;
  pageId?: string;
  title: string;
  description?: string;
  priority: number;
  ownerUuid?: string;
  profilesImpacted?: string[];
  raci?: {
    R?: string[];
    A?: string[];
    C?: string[];
    I?: string[];
  };
}

/**
 * Interface pour les données de mise à jour d'une tâche
 */
export interface UpdateTaskInput {
  phaseCode?: string;
  pageId?: string;
  title?: string;
  description?: string;
  priority?: number;
  ownerUuid?: string;
  plannedStart?: Date;
  plannedEnd?: Date;
  profilesImpacted?: string[];
  raci?: {
    R?: string[];
    A?: string[];
    C?: string[];
    I?: string[];
  };
}

// DTOs enrichis pour les réponses du service

export interface TaskWithRaciDTO extends TaskDTO {
  raci?: {
    R: string[];
    A: string[];
    C: string[];
    I: string[];
  };
  subtasks?: SubTaskDTO[];
  profilesImpacted?: string[];
}

export interface SubTaskWithRaciDTO extends SubTaskDTO {
  raci?: {
    R: string[];
    A: string[];
    C: string[];
    I: string[];
  };
}

export interface CreateTaskResponse {
  task: TaskWithRaciDTO;
  message: string;
}

export interface UpdateTaskResponse {
  task: TaskWithRaciDTO;
  message: string;
}

export interface CreateSubTaskResponse {
  subtask: SubTaskWithRaciDTO;
  message: string;
}

/**
 * TaskService - Service responsable de la logique métier des tâches
 * 
 * Ce service implémente toutes les opérations liées aux tâches:
 * - Création, mise à jour et suppression de tâches
 * - Gestion des sous-tâches
 * - Gestion des attributions RACI
 * - Changement de phase
 * - Vérification des permissions basées sur le RACI
 */
export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly subtaskRepository: SubTaskRepository,
    private readonly raciRepository: RaciRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly realtimeBroker: IRealtimeBroker
  ) {}

  /**
   * Verrouille une tâche pour édition
   * Indique aux autres utilisateurs qu'une tâche est en cours d'édition
   *
   * Note: L'implémentation avec Redis/BDD est prévue post-MVP
   * Cette méthode servira de point d'extension
   *
   * @param taskId ID de la tâche
   * @param userUuid UUID de l'utilisateur qui verrouille
   * @param userInfo Informations sur l'utilisateur (nom, etc.)
   * @returns Résultat de succès ou erreur
   */
  async lockTaskForEditing(
    taskId: string,
    userUuid: string,
    userInfo: { name: string }
  ): Promise<Result<void, Error>> {
    try {
      // Post-MVP: Stocker le verrou dans Redis ou table edit_lock
      
      // Notifier les clients qu'une tâche est en cours d'édition
      this.realtimeBroker.emitTaskLocked(
        taskId,
        { uuid: userUuid, name: userInfo.name },
      );
      
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Déverrouille une tâche après édition
   *
   * Note: L'implémentation avec Redis/BDD est prévue post-MVP
   * Cette méthode servira de point d'extension
   *
   * @param taskId ID de la tâche
   * @returns Résultat de succès ou erreur
   */
  async unlockTaskAfterEditing(taskId: string): Promise<Result<void, Error>> {
    try {
      // Post-MVP: Supprimer le verrou dans Redis ou table edit_lock
      
      // Notifier les clients que la tâche n'est plus en cours d'édition
      this.realtimeBroker.emitTaskUnlocked(taskId);
      
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Crée une nouvelle tâche avec informations enrichies
   *
   * @param input Données de la tâche à créer
   * @param creatorUuid UUID de l'utilisateur créant la tâche
   * @returns Résultat contenant la réponse de création ou une erreur
   */
  async createTask(input: CreateTaskInput, creatorUuid: string): Promise<Result<CreateTaskResponse, Error>> {
    try {
      // Vérifier que les profils impactés existent
      if (input.profilesImpacted && input.profilesImpacted.length > 0) {
        for (const profileCode of input.profilesImpacted) {
          const profileResult = await this.profileRepository.findByCode(profileCode);
          if (profileResult.isFailure()) {
            return Result.failure(new Error(`Le profil ${profileCode} n'existe pas`));
          }
        }
      }

      // Utilisation d'une transaction pour garantir l'atomicité des opérations de base de données
      // BaseKnexRepository.transaction est accessible via le repository
      return await (this.taskRepository as any).transaction(async (trx: any) => {
        // Création de la tâche avec valeurs par défaut
        const taskCreateResult = Task.create({
          id: undefined, // Sera généré par la base de données
          phaseCode: input.phaseCode,
          pageId: input.pageId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          ownerUuid: input.ownerUuid,
          progress: 0, // Progression initiale à 0%
          createdBy: creatorUuid,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        if (taskCreateResult.isFailure()) {
          return Result.failure(taskCreateResult.getErrorValue());
        }

        const task = taskCreateResult.getValue();
        
        // Persister la tâche dans la base de données
        // Utilisation de la transaction
        const queryBuilder = trx('task');
        const now = new Date();
        
        // Insert new task avec transaction
        await queryBuilder.insert({
          id: task.getId() || undefined, // Undefined laissera la BD générer l'ID
          phase_code: task.getPhaseCode(),
          page_id: task.getPageId(),
          title: task.getTitle(),
          description: task.getDescription(),
          priority: task.getPriority(),
          owner_uuid: task.getOwnerUuid(),
          progress: task.getProgress(),
          created_by: task.getCreatedBy(),
          created_at: task.getCreatedAt() || now,
          updated_at: task.getUpdatedAt() || now,
          planned_start: task.getPlannedStart(),
          planned_end: task.getPlannedEnd()
        });
        
        // Récupérer l'ID si généré par la BD
        const savedTaskRecord = await trx('task')
          .where({
            title: task.getTitle(),
            created_by: task.getCreatedBy(),
            created_at: task.getCreatedAt() || now
          })
          .orderBy('created_at', 'desc')
          .first();
        
        const taskId = savedTaskRecord.id;
        // Task est immuable, on utilise directement l'ID généré
        
        // Enregistrer les attributions RACI si fournies, avec la transaction
        if (input.raci) {
          for (const letter of ['R', 'A', 'C', 'I'] as RaciLetter[]) {
            const users = input.raci[letter];
            if (users && users.length > 0) {
              for (const userUuid of users) {
                await trx('task_raci').insert({
                  task_id: taskId,
                  user_uuid: userUuid,
                  letter,
                  created_at: now,
                  updated_at: now
                });
              }
            }
          }
        }
        
        // Enregistrer les profils impactés si fournis, avec la transaction
        if (input.profilesImpacted && input.profilesImpacted.length > 0) {
          const profileRows = input.profilesImpacted.map(code => ({
            task_id: taskId,
            profile_code: code,
            created_at: now
          }));
          
          await trx('task_profile').insert(profileRows);
        }
        
        // Récupérer les informations RACI
        const raciAssignments = await trx('task_raci')
          .where('task_id', taskId)
          .select('*');
        
        // Organiser les attributions RACI
        // Type explicite pour éviter les erreurs TypeScript
        interface RaciRecord {
          letter: string;
          user_uuid: string;
          [key: string]: any;
        }
        
        const raci = {
          R: raciAssignments.filter((r: RaciRecord) => r.letter === 'R').map((r: RaciRecord) => r.user_uuid),
          A: raciAssignments.filter((r: RaciRecord) => r.letter === 'A').map((r: RaciRecord) => r.user_uuid),
          C: raciAssignments.filter((r: RaciRecord) => r.letter === 'C').map((r: RaciRecord) => r.user_uuid),
          I: raciAssignments.filter((r: RaciRecord) => r.letter === 'I').map((r: RaciRecord) => r.user_uuid),
        };
        
        // Créer la réponse enrichie
        const taskWithRaci: TaskWithRaciDTO = {
          ...task.toObject(),
          raci,
          subtasks: [], // Pas de sous-tâches à la création
          profilesImpacted: input.profilesImpacted || []
        };
        
        const response: CreateTaskResponse = {
          task: taskWithRaci,
          message: 'Tâche créée avec succès'
        };
        
        // Notifier les clients via WebSocket avec l'ID correct
        this.realtimeBroker.emitTaskCreated({
          ...task.toObject(),
          id: taskId // Assurer que l'ID généré par la BD est utilisé
        });
        
        return Result.success(response);
      });
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Met à jour une tâche existante
   * 
   * @param taskId ID de la tâche à mettre à jour
   * @param input Données de mise à jour partielles
   * @param userUuid UUID de l'utilisateur effectuant la mise à jour
   * @param userRole Rôle de l'utilisateur
   * @returns Résultat contenant la réponse de mise à jour ou une erreur
   */
  async updateTask(
    taskId: string,
    input: UpdateTaskInput,
    userUuid: string,
    userRole: string
  ): Promise<Result<UpdateTaskResponse, Error>> {
    try {
      // Récupérer la tâche existante
      const taskResult = await this.taskRepository.findById(taskId);
      
      if (taskResult.isFailure()) {
        return Result.failure(taskResult.getErrorValue());
      }
      
      const task = taskResult.getValue();
      
      // Vérifier les permissions
      const canModifyResult = await this.canModifyTask(taskId, userUuid, userRole);
      
      if (canModifyResult.isFailure()) {
        return Result.failure(canModifyResult.getErrorValue());
      }
      
      if (!canModifyResult.getValue()) {
        return Result.failure(
          new Error(`Forbidden - user ${userRole} cannot modify task ${taskId} (needs R or A or be owner/CP/RF)`)
        );
      }
      
      // Mise à jour des champs modifiables
      if (input.title !== undefined) {
        const titleResult = task.updateTitle(input.title);
        if (titleResult.isFailure()) {
          return Result.failure(titleResult.getErrorValue());
        }
      }
      
      if (input.description !== undefined) {
        const descResult = task.updateDescription(input.description);
        if (descResult.isFailure()) {
          return Result.failure(descResult.getErrorValue());
        }
      }
      
      if (input.priority !== undefined) {
        const priorityResult = task.updatePriority(input.priority);
        if (priorityResult.isFailure()) {
          return Result.failure(priorityResult.getErrorValue());
        }
      }
      
      // Changement de phase: permission spéciale (owner, CP, RF)
      if (input.phaseCode !== undefined && input.phaseCode !== task.getPhaseCode()) {
        const canChangePhaseResult = await this.canChangePhase(taskId, userUuid, userRole);
        
        if (canChangePhaseResult.isFailure()) {
          return Result.failure(canChangePhaseResult.getErrorValue());
        }
        
        if (!canChangePhaseResult.getValue()) {
          return Result.failure(
            new Error(`Forbidden - user ${userRole} cannot change phase for task ${taskId} (needs to be owner, CP or RF)`)
          );
        }
        
        const phaseResult = task.updatePhase(input.phaseCode);
        if (phaseResult.isFailure()) {
          return Result.failure(phaseResult.getErrorValue());
        }
      }
      
      // Mise à jour des autres champs selon les permissions
      if (input.ownerUuid !== undefined) {
        const ownerResult = task.updateOwner(input.ownerUuid);
        if (ownerResult.isFailure()) {
          return Result.failure(ownerResult.getErrorValue());
        }
      }
      
      if (input.plannedStart !== undefined || input.plannedEnd !== undefined) {
        const datesResult = task.updatePlannedDates(input.plannedStart, input.plannedEnd);
        if (datesResult.isFailure()) {
          return Result.failure(datesResult.getErrorValue());
        }
      }
      
      // Utilisation d'une transaction pour garantir l'atomicité des opérations de base de données
      return await (this.taskRepository as any).transaction(async (trx: any) => {
        // Persister les modifications de la tâche dans la transaction
        const now = new Date();
        
        await trx('task')
          .where('id', taskId)
          .update({
            phase_code: task.getPhaseCode(),
            page_id: task.getPageId(),
            title: task.getTitle(),
            description: task.getDescription(),
            priority: task.getPriority(),
            owner_uuid: task.getOwnerUuid(),
            progress: task.getProgress(),
            updated_at: now,
            planned_start: task.getPlannedStart(),
            planned_end: task.getPlannedEnd()
          });
        
        // Mise à jour des attributions RACI si fournies
        if (input.raci) {
          // Supprimer les attributions existantes dans la transaction
          await trx('task_raci')
            .where('task_id', taskId)
            .delete();
          
          // Ajouter les nouvelles attributions dans la transaction
          for (const letter of ['R', 'A', 'C', 'I'] as RaciLetter[]) {
            const users = input.raci[letter];
            if (users && users.length > 0) {
              for (const userUuid of users) {
                await trx('task_raci').insert({
                  task_id: taskId,
                  user_uuid: userUuid,
                  letter,
                  created_at: now,
                  updated_at: now
                });
              }
            }
          }
        }
        
        // Mise à jour des profils impactés si fournis
        if (input.profilesImpacted) {
          // Supprimer les associations existantes dans la transaction
          await trx('task_profile')
            .where('task_id', taskId)
            .delete();
          
          // Ajouter les nouvelles associations dans la transaction
          if (input.profilesImpacted.length > 0) {
            const profileRows = input.profilesImpacted.map(code => ({
              task_id: taskId,
              profile_code: code,
              created_at: now
            }));
            
            await trx('task_profile').insert(profileRows);
          }
        }
        
        // Récupérer les informations pour enrichir la réponse
        // Note: on pourrait utiliser getTaskWithDetails, mais pour préserver la transaction,
        // nous récupérons les données directement
        const raciAssignments = await trx('task_raci')
          .where('task_id', taskId)
          .select('*');
        
        const subtasks = await trx('subtask')
          .where('task_id', taskId)
          .select('*');
        
        const profiles = await trx('task_profile')
          .where('task_id', taskId)
          .join('profile', 'task_profile.profile_code', 'profile.code')
          .select('profile.code');
        
        // Organiser les données
        interface RaciAssignment {
          letter: string;
          user_uuid: string;
          [key: string]: any;
        }

        const raci = {
          R: raciAssignments.filter((r: RaciAssignment) => r.letter === 'R').map((r: RaciAssignment) => r.user_uuid),
          A: raciAssignments.filter((r: RaciAssignment) => r.letter === 'A').map((r: RaciAssignment) => r.user_uuid),
          C: raciAssignments.filter((r: RaciAssignment) => r.letter === 'C').map((r: RaciAssignment) => r.user_uuid),
          I: raciAssignments.filter((r: RaciAssignment) => r.letter === 'I').map((r: RaciAssignment) => r.user_uuid),
        };
        
        // Construire la réponse
        const taskWithDetails: TaskWithRaciDTO = {
          ...task.toObject(),
          raci,
          subtasks: subtasks.map((st: any) => ({
            id: st.id,
            taskId: st.task_id,
            title: st.title,
            completed: !!st.completed,
            createdBy: st.created_by,
            createdAt: st.created_at,
            updatedAt: st.updated_at
          })),
          profilesImpacted: profiles.map((p: any) => p.code)
        };
        
        const response: UpdateTaskResponse = {
          task: taskWithDetails,
          message: 'Tâche mise à jour avec succès'
        };
        
        // Notifier les clients via WebSocket
        this.realtimeBroker.emitTaskUpdated(task.toObject());
        
        return Result.success(response);
      });
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Supprime une tâche
   * 
   * @param taskId ID de la tâche à supprimer
   * @param userUuid UUID de l'utilisateur effectuant la suppression
   * @param userRole Rôle de l'utilisateur
   * @returns Résultat de succès ou erreur
   */
  async deleteTask(taskId: string, userUuid: string, userRole: string): Promise<Result<void, Error>> {
    try {
      // Vérifier que la tâche existe
      const taskResult = await this.taskRepository.findById(taskId);
      
      if (taskResult.isFailure()) {
        return Result.failure(taskResult.getErrorValue());
      }
      
      // Vérifier les permissions (seuls CP, RF ou owner peuvent supprimer)
      const task = taskResult.getValue();
      const isOwner = task.getOwnerUuid() === userUuid;
      const hasPermission = ['CP', 'RF'].includes(userRole) || isOwner;
      
      if (!hasPermission) {
        return Result.failure(
          new Error(`Forbidden - user ${userRole} cannot delete task ${taskId} (needs to be owner, CP or RF)`)
        );
      }
      
      // Supprimer la tâche (les sous-tâches et RACI sont supprimés par cascade)
      const deleteResult = await this.taskRepository.delete(taskId);
      
      if (deleteResult.isFailure()) {
        return deleteResult;
      }
      
      // Notifier les clients via WebSocket
      this.realtimeBroker.emitTaskDeleted(taskId);
      
      return Result.success(undefined);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Crée une sous-tâche et copie le RACI de la tâche parente
   * 
   * @param taskId ID de la tâche parente
   * @param subtaskData Données de la sous-tâche
   * @param userUuid UUID de l'utilisateur créant la sous-tâche
   * @param userRole Rôle de l'utilisateur
   * @returns Résultat contenant la réponse de création ou une erreur
   */
  async createSubTask(
    taskId: string,
    subtaskData: { title: string; done?: boolean },
    userUuid: string,
    userRole: string
  ): Promise<Result<CreateSubTaskResponse, Error>> {
    try {
      // Vérifier que la tâche parente existe
      const taskResult = await this.taskRepository.findById(taskId);
      
      if (taskResult.isFailure()) {
        return Result.failure(new Error(`Task with ID ${taskId} not found`));
      }
      
      // Vérifier les permissions
      const canModifyResult = await this.canModifyTask(taskId, userUuid, userRole);
      
      if (canModifyResult.isFailure()) {
        return Result.failure(canModifyResult.getErrorValue());
      }
      
      if (!canModifyResult.getValue()) {
        return Result.failure(
          new Error(`Forbidden - user ${userRole} cannot add subtask to task ${taskId} (needs R or A or be owner/CP/RF)`)
        );
      }
      
      // Créer la sous-tâche
      const subtaskCreateResult = SubTask.create({
        id: undefined, // Sera généré par la base de données
        taskId,
        title: subtaskData.title,
        completed: subtaskData.done || false,
        createdBy: userUuid
      });
      
      if (subtaskCreateResult.isFailure()) {
        return Result.failure(subtaskCreateResult.getErrorValue());
      }
      
      const subtask = subtaskCreateResult.getValue();
      
      // Utilisation d'une transaction pour garantir l'atomicité des opérations
      return await (this.subtaskRepository as any).transaction(async (trx: any) => {
        // Persister la sous-tâche avec la transaction
        const now = new Date();
        
        // Insertion de la sous-tâche
        await trx('subtask').insert({
          id: subtask.getId() || undefined, // Undefined laissera la BD générer l'ID
          task_id: subtask.getTaskId(),
          title: subtask.getTitle(),
          completed: subtask.isCompleted(),
          created_by: subtask.getCreatedBy(),
          created_at: now,
          updated_at: now
        });
        
        // Récupérer l'ID si généré par la BD
        const savedSubtaskRecord = await trx('subtask')
          .where({
            title: subtask.getTitle(),
            task_id: subtask.getTaskId(),
            created_by: subtask.getCreatedBy()
          })
          .orderBy('created_at', 'desc')
          .first();
        
        const subtaskId = savedSubtaskRecord.id;
        
        // Copier les attributions RACI de la tâche vers la sous-tâche dans la transaction
        // Récupérer d'abord les attributions RACI de la tâche
        const taskRacis = await trx('task_raci')
          .where('task_id', taskId)
          .select('*');
        
        // Créer les enregistrements pour la sous-tâche
        if (taskRacis.length > 0) {
          const subtaskRacis = taskRacis.map((raci: any) => ({
            subtask_id: subtaskId,
            user_uuid: raci.user_uuid,
            letter: raci.letter,
            created_at: now,
            updated_at: now
          }));
          
          // Insérer les attributions RACI pour la sous-tâche
          await trx('subtask_raci').insert(subtaskRacis);
        }
        
        // Récupérer les attributions RACI de la sous-tâche pour la réponse
        const subtaskRacis = await trx('subtask_raci')
          .where('subtask_id', subtaskId)
          .select('*');
        
        // Organiser les attributions RACI
        interface RaciAssignment {
          letter: string;
          user_uuid: string;
          [key: string]: any;
        }

        const raci = {
          R: subtaskRacis.filter((r: RaciAssignment) => r.letter === 'R').map((r: RaciAssignment) => r.user_uuid),
          A: subtaskRacis.filter((r: RaciAssignment) => r.letter === 'A').map((r: RaciAssignment) => r.user_uuid),
          C: subtaskRacis.filter((r: RaciAssignment) => r.letter === 'C').map((r: RaciAssignment) => r.user_uuid),
          I: subtaskRacis.filter((r: RaciAssignment) => r.letter === 'I').map((r: RaciAssignment) => r.user_uuid),
        };
        
        // Créer la réponse enrichie avec la sous-tâche complète incluant l'ID généré
        const subtaskDTO = {
          id: subtaskId,
          taskId: subtask.getTaskId(),
          title: subtask.getTitle(),
          completed: subtask.isCompleted(),
          createdBy: subtask.getCreatedBy(),
          createdAt: now,
          updatedAt: now
        };
        
        const subtaskWithRaci: SubTaskWithRaciDTO = {
          ...subtaskDTO,
          raci
        };
        
        const response: CreateSubTaskResponse = {
          subtask: subtaskWithRaci,
          message: 'Sous-tâche créée avec succès'
        };
        
        // Notifier les clients via WebSocket
        this.realtimeBroker.emitSubTaskUpdated(subtaskDTO);
        
        return Result.success(response);
      });
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Met à jour l'état d'une sous-tâche (cochée ou non)
   * 
   * @param subtaskId ID de la sous-tâche
   * @param done Nouvel état (cochée ou non)
   * @param userUuid UUID de l'utilisateur effectuant la mise à jour
   * @param userRole Rôle de l'utilisateur
   * @returns Résultat contenant la sous-tâche mise à jour ou une erreur
   */
  async updateSubTaskStatus(
    subtaskId: string,
    done: boolean,
    userUuid: string,
    userRole: string
  ): Promise<Result<SubTaskWithRaciDTO, Error>> {
    try {
      // Récupérer la sous-tâche
      const subtaskResult = await this.subtaskRepository.findById(subtaskId);
      
      if (subtaskResult.isFailure()) {
        return Result.failure(subtaskResult.getErrorValue());
      }
      
      const subtask = subtaskResult.getValue();
      const taskId = subtask.getTaskId();
      
      // Vérifier les permissions
      const canModifyResult = await this.canModifyTask(taskId, userUuid, userRole);
      
      if (canModifyResult.isFailure()) {
        return Result.failure(canModifyResult.getErrorValue());
      }
      
      if (!canModifyResult.getValue()) {
        return Result.failure(
          new Error(`Forbidden - user ${userRole} cannot update subtask ${subtaskId} (needs R or A or be owner/CP/RF)`)
        );
      }
      
      // Mettre à jour l'état
      if (done) {
        subtask.markCompleted();
      } else {
        subtask.markIncomplete();
      }
      
      // Persister la mise à jour
      const updatedSubtaskResult = await this.subtaskRepository.save(subtask);
      
      if (updatedSubtaskResult.isFailure()) {
        return Result.failure(updatedSubtaskResult.getErrorValue());
      }
      
      const updatedSubtask = updatedSubtaskResult.getValue();
      
      // Récupérer les attributions RACI pour la réponse
      const raciResult = await this.raciRepository.findBySubTaskId(Number(updatedSubtask.getId()));
      const raciAssignments = raciResult.isSuccess() ? raciResult.getValue() : [];
      
      // Organiser les attributions RACI
      interface RaciAssignment {
        letter: string;
        userUuid: string;
        [key: string]: any;
      }

      const raci = {
        R: raciAssignments.filter((r: RaciAssignment) => r.letter === 'R').map((r: RaciAssignment) => r.userUuid),
        A: raciAssignments.filter((r: RaciAssignment) => r.letter === 'A').map((r: RaciAssignment) => r.userUuid),
        C: raciAssignments.filter((r: RaciAssignment) => r.letter === 'C').map((r: RaciAssignment) => r.userUuid),
        I: raciAssignments.filter((r: RaciAssignment) => r.letter === 'I').map((r: RaciAssignment) => r.userUuid),
      };
      
      // Créer la réponse enrichie
      const subtaskWithRaci: SubTaskWithRaciDTO = {
        ...updatedSubtask.toObject(),
        raci
      };
      
      // Notifier les clients via WebSocket
      this.realtimeBroker.emitSubTaskUpdated(updatedSubtask.toObject());
      
      // Récupérer la tâche parente mise à jour avec la progression recalculée par le trigger BDD
      const updatedTask = await this.taskRepository.findById(taskId);
      
      if (updatedTask.isSuccess()) {
        // Notifier les clients de la mise à jour de la tâche parente
        this.realtimeBroker.emitTaskUpdated(updatedTask.getValue().toObject());
      }
      
      return Result.success(subtaskWithRaci);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Vérifie si une tâche est actuellement verrouillée pour édition
   * Ce verrouillage "soft" permet d'afficher un badge "en cours d'édition"
   * et d'éviter les modifications simultanées
   *
   * Note: L'implémentation avec Redis/BDD est prévue post-MVP
   * Cette méthode servira de point d'extension
   *
   * @param taskId ID de la tâche
   * @param userUuid UUID de l'utilisateur qui souhaite modifier
   * @returns Résultat contenant {locked: boolean, lockedBy?: string}
   */
  async isTaskLocked(taskId: string, userUuid: string): Promise<Result<{locked: boolean, lockedBy?: string}, Error>> {
    try {
      // Post-MVP: Vérifier dans Redis ou table edit_lock si la tâche est verrouillée
      // Pour l'instant, aucun verrouillage n'est appliqué
      return Result.success({ locked: false });
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Vérifie si un utilisateur peut modifier une tâche
   * Règles:
   * - Les rôles CP et RF peuvent toujours modifier
   * - Le propriétaire (owner) peut modifier
   * - Les utilisateurs avec attribution R ou A peuvent modifier
   * - Vérification du verrouillage soft (si la tâche est en cours d'édition)
   *
   * @param taskId ID de la tâche
   * @param userUuid UUID de l'utilisateur
   * @param userRole Rôle de l'utilisateur
   * @returns Résultat booléen indiquant si l'utilisateur peut modifier
   */
  async canModifyTask(taskId: string, userUuid: string, userRole: string): Promise<Result<boolean, Error>> {
    try {
      // CP et RF peuvent toujours modifier
      if (['CP', 'RF'].includes(userRole)) {
        return Result.success(true);
      }
      
      // Récupérer la tâche
      const taskResult = await this.taskRepository.findById(taskId);
      
      if (taskResult.isFailure()) {
        return Result.failure(taskResult.getErrorValue());
      }
      
      const task = taskResult.getValue();
      
      // Le propriétaire peut modifier
      if (task.getOwnerUuid() === userUuid) {
        return Result.success(true);
      }
      
      // Vérifier les attributions RACI
      const raciResult = await this.raciRepository.findByTaskId(Number(taskId));
      
      if (raciResult.isFailure()) {
        return Result.failure(raciResult.getErrorValue());
      }
      
      const raciAssignments = raciResult.getValue();
      
      // Les utilisateurs avec R ou A peuvent modifier
      let hasPermission = false;
      for (const raci of raciAssignments) {
        if (raci.userUuid === userUuid && ['R', 'A'].includes(raci.letter)) {
          hasPermission = true;
          break;
        }
      }
      
      if (!hasPermission) {
        // Aucune permission trouvée
        return Result.success(false);
      }
      
      // Vérifier si la tâche est verrouillée par un autre utilisateur
      const lockResult = await this.isTaskLocked(taskId, userUuid);
      
      if (lockResult.isFailure()) {
        return Result.failure(lockResult.getErrorValue());
      }
      
      const lockInfo = lockResult.getValue();
      
      if (lockInfo.locked && lockInfo.lockedBy !== userUuid) {
        // La tâche est verrouillée par un autre utilisateur
        return Result.failure(
          new Error(`Task ${taskId} is currently being edited by another user`)
        );
      }
      
      // L'utilisateur a la permission et la tâche n'est pas verrouillée
      return Result.success(true);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Vérifie si un utilisateur peut changer la phase d'une tâche
   * Règles:
   * - Les rôles CP et RF peuvent toujours changer la phase
   * - Le propriétaire (owner) peut changer la phase
   * 
   * @param taskId ID de la tâche
   * @param userUuid UUID de l'utilisateur
   * @param userRole Rôle de l'utilisateur
   * @returns Résultat booléen indiquant si l'utilisateur peut changer la phase
   */
  async canChangePhase(taskId: string, userUuid: string, userRole: string): Promise<Result<boolean, Error>> {
    try {
      // CP et RF peuvent toujours changer la phase
      if (['CP', 'RF'].includes(userRole)) {
        return Result.success(true);
      }
      
      // Récupérer la tâche
      const taskResult = await this.taskRepository.findById(taskId);
      
      if (taskResult.isFailure()) {
        return Result.failure(taskResult.getErrorValue());
      }
      
      const task = taskResult.getValue();
      
      // Le propriétaire peut changer la phase
      if (task.getOwnerUuid() === userUuid) {
        return Result.success(true);
      }
      
      // Aucune permission trouvée
      return Result.success(false);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Récupère une tâche avec toutes ses informations
   * 
   * @param taskId ID de la tâche
   * @returns Résultat contenant les détails enrichis de la tâche ou une erreur
   */
  async getTaskWithDetails(taskId: string): Promise<Result<TaskWithRaciDTO, Error>> {
    try {
      // Récupérer la tâche
      const taskResult = await this.taskRepository.findById(taskId);
      
      if (taskResult.isFailure()) {
        return Result.failure(taskResult.getErrorValue());
      }
      
      const task = taskResult.getValue();
      
      // Récupérer les informations RACI
      const raciResult = await this.raciRepository.findByTaskId(Number(taskId));
      const raciAssignments = raciResult.isSuccess() ? raciResult.getValue() : [];
      
      // Récupérer les sous-tâches
      const subtasksResult = await this.subtaskRepository.findByTaskId(taskId);
      const subtasks = subtasksResult.isSuccess() ? subtasksResult.getValue() : [];
      
      // Récupérer les profils impactés
      const profilesResult = await this.profileRepository.findByTaskId(taskId);
      const profiles = profilesResult.isSuccess() ? profilesResult.getValue() : [];
      
      // Organiser les données
      interface RaciAssignment {
        letter: string;
        userUuid: string;
        [key: string]: any;
      }

      const raci = {
        R: raciAssignments.filter((r: RaciAssignment) => r.letter === 'R').map((r: RaciAssignment) => r.userUuid),
        A: raciAssignments.filter((r: RaciAssignment) => r.letter === 'A').map((r: RaciAssignment) => r.userUuid),
        C: raciAssignments.filter((r: RaciAssignment) => r.letter === 'C').map((r: RaciAssignment) => r.userUuid),
        I: raciAssignments.filter((r: RaciAssignment) => r.letter === 'I').map((r: RaciAssignment) => r.userUuid),
      };
      
      const taskWithDetails: TaskWithRaciDTO = {
        ...task.toObject(),
        raci,
        subtasks: subtasks.map(st => st.toObject()),
        profilesImpacted: profiles.map(p => p.getCode())
      };
      
      return Result.success(taskWithDetails);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Récupère toutes les tâches avec informations de base
   * 
   * @param filters Filtres optionnels
   * @returns Résultat contenant les tâches ou une erreur
   */
  async getTasksWithBasicInfo(filters: any = {}): Promise<Result<TaskDTO[], Error>> {
    try {
      const tasksResult = await this.taskRepository.find(filters);
      
      if (tasksResult.isFailure()) {
        return Result.failure(tasksResult.getErrorValue());
      }
      
      const tasks = tasksResult.getValue();
      const taskDTOs = tasks.map(task => task.toObject());
      
      return Result.success(taskDTOs);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Récupère toutes les tâches avec filtrage (méthode pour compatibilité)
   * 
   * @param filters Filtres optionnels
   * @returns Résultat contenant les tâches ou une erreur
   * @deprecated Utiliser getTasksWithBasicInfo à la place
   */
  async getTasks(filters: any = {}): Promise<Result<Task[], Error>> {
    try {
      return await this.taskRepository.find(filters);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Récupère une tâche par son ID (méthode pour compatibilité)
   * 
   * @param taskId ID de la tâche
   * @returns Résultat contenant la tâche ou une erreur
   * @deprecated Utiliser getTaskWithDetails à la place
   */
  async getTaskById(taskId: string): Promise<Result<Task, Error>> {
    try {
      return await this.taskRepository.findById(taskId);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}