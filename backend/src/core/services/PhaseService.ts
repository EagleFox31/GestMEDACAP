import { Phase, PhaseDTO } from '../domain/phase/Phase';
import { Result } from '../domain/shared/Result';
import { PhaseRepository, PhaseOrder } from '../../ports/db/PhaseRepository';
import { TaskRepository } from '../../ports/db/TaskRepository';

/**
 * Interface pour les données d'entrée de création d'une phase
 */
export interface CreatePhaseInput {
  code: string;
  name: string;
  position?: number; // Optionnel car peut être calculé automatiquement
}

/**
 * Interface pour les données de mise à jour d'une phase
 */
export interface UpdatePhaseInput {
  name?: string;
  position?: number;
}

/**
 * Interface pour la réponse de création d'une phase
 */
export interface CreatePhaseResponse {
  phase: PhaseDTO;
  message: string;
}

/**
 * Interface pour la réponse de mise à jour d'une phase
 */
export interface UpdatePhaseResponse {
  phase: PhaseDTO;
  message: string;
}

/**
 * PhaseService - Service responsable de la gestion des phases MEDACAP
 * 
 * Ce service implémente toutes les opérations liées aux phases:
 * - Création et mise à jour des phases
 * - Récupération des phases et de leurs données
 * - Réorganisation des phases
 * - Vérification des contraintes métier liées aux phases
 */
export class PhaseService {
  constructor(
    private readonly phaseRepository: PhaseRepository,
    private readonly taskRepository: TaskRepository
  ) {}

  /**
   * Crée une nouvelle phase
   * 
   * @param input Données de la phase à créer
   * @param userRole Rôle de l'utilisateur effectuant la création
   * @returns Résultat contenant la réponse de création ou une erreur
   */
  async createPhase(input: CreatePhaseInput, userRole: string): Promise<Result<CreatePhaseResponse, Error>> {
    try {
      // Vérifier les permissions - seuls CP et RF peuvent créer des phases
      if (!['CP', 'RF'].includes(userRole)) {
        return Result.failure(
          new Error('Forbidden - only CP or RF roles can create phases')
        );
      }

      // Vérifier si une phase avec ce code existe déjà
      const existsResult = await this.phaseRepository.existsByCode(input.code);
      
      if (existsResult.isFailure()) {
        return Result.failure(existsResult.getErrorValue());
      }
      
      if (existsResult.getValue()) {
        return Result.failure(new Error(`Phase with code ${input.code} already exists`));
      }

      // Déterminer la position si non fournie
      let position = input.position;
      
      if (position === undefined) {
        const maxPositionResult = await this.phaseRepository.getMaxPosition();
        
        if (maxPositionResult.isFailure()) {
          return Result.failure(maxPositionResult.getErrorValue());
        }
        
        position = maxPositionResult.getValue() + 1;
      }

      // Créer la phase
      const phaseCreateResult = Phase.create({
        code: input.code,
        name: input.name,
        position
      });

      if (phaseCreateResult.isFailure()) {
        return Result.failure(phaseCreateResult.getErrorValue());
      }

      const phase = phaseCreateResult.getValue();
      
      // Persister la phase
      const savedPhaseResult = await this.phaseRepository.save(phase);
      
      if (savedPhaseResult.isFailure()) {
        return Result.failure(savedPhaseResult.getErrorValue());
      }
      
      const savedPhase = savedPhaseResult.getValue();
      
      // Créer la réponse
      const response: CreatePhaseResponse = {
        phase: savedPhase.toObject(),
        message: 'Phase créée avec succès'
      };
      
      return Result.success(response);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Met à jour une phase existante
   * 
   * @param code Code de la phase à mettre à jour
   * @param input Données de mise à jour
   * @param userRole Rôle de l'utilisateur effectuant la mise à jour
   * @returns Résultat contenant la réponse de mise à jour ou une erreur
   */
  async updatePhase(
    code: string, 
    input: UpdatePhaseInput, 
    userRole: string
  ): Promise<Result<UpdatePhaseResponse, Error>> {
    try {
      // Vérifier les permissions - seuls CP et RF peuvent modifier des phases
      if (!['CP', 'RF'].includes(userRole)) {
        return Result.failure(
          new Error('Forbidden - only CP or RF roles can update phases')
        );
      }

      // Récupérer la phase
      const phaseResult = await this.phaseRepository.findByCode(code);
      
      if (phaseResult.isFailure()) {
        return Result.failure(phaseResult.getErrorValue());
      }
      
      const phase = phaseResult.getValue();
      
      // Mettre à jour les champs
      if (input.name !== undefined) {
        const nameResult = phase.updateName(input.name);
        if (nameResult.isFailure()) {
          return Result.failure(nameResult.getErrorValue());
        }
      }
      
      if (input.position !== undefined) {
        const positionResult = phase.updatePosition(input.position);
        if (positionResult.isFailure()) {
          return Result.failure(positionResult.getErrorValue());
        }
      }
      
      // Persister les modifications
      const updatedPhaseResult = await this.phaseRepository.save(phase);
      
      if (updatedPhaseResult.isFailure()) {
        return Result.failure(updatedPhaseResult.getErrorValue());
      }
      
      const updatedPhase = updatedPhaseResult.getValue();
      
      // Créer la réponse
      const response: UpdatePhaseResponse = {
        phase: updatedPhase.toObject(),
        message: 'Phase mise à jour avec succès'
      };
      
      return Result.success(response);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Supprime une phase
   * 
   * @param code Code de la phase à supprimer
   * @param userRole Rôle de l'utilisateur effectuant la suppression
   * @returns Résultat de succès ou erreur
   */
  async deletePhase(code: string, userRole: string): Promise<Result<void, Error>> {
    try {
      // Vérifier les permissions - seuls CP et RF peuvent supprimer des phases
      if (!['CP', 'RF'].includes(userRole)) {
        return Result.failure(
          new Error('Forbidden - only CP or RF roles can delete phases')
        );
      }

      // Vérifier si des tâches utilisent cette phase
      const tasksResult = await this.taskRepository.find({ phaseCode: code });
      
      if (tasksResult.isFailure()) {
        return Result.failure(tasksResult.getErrorValue());
      }
      
      const tasks = tasksResult.getValue();
      
      if (tasks.length > 0) {
        return Result.failure(
          new Error(`Cannot delete phase with code ${code} because it is used by ${tasks.length} tasks`)
        );
      }
      
      // Supprimer la phase
      return await this.phaseRepository.delete(code);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Réorganise les positions des phases
   * 
   * @param phaseOrders Nouvel ordre des phases
   * @param userRole Rôle de l'utilisateur effectuant la réorganisation
   * @returns Résultat de succès ou erreur
   */
  async reorderPhases(phaseOrders: PhaseOrder[], userRole: string): Promise<Result<void, Error>> {
    try {
      // Vérifier les permissions - seuls CP et RF peuvent réorganiser des phases
      if (!['CP', 'RF'].includes(userRole)) {
        return Result.failure(
          new Error('Forbidden - only CP or RF roles can reorder phases')
        );
      }

      // Vérifier que toutes les phases existent
      const phasesResult = await this.phaseRepository.findAll();
      
      if (phasesResult.isFailure()) {
        return Result.failure(phasesResult.getErrorValue());
      }
      
      const existingPhases = phasesResult.getValue();
      const existingPhaseCodes = existingPhases.map(p => p.getCode());
      
      for (const phaseOrder of phaseOrders) {
        if (!existingPhaseCodes.includes(phaseOrder.code)) {
          return Result.failure(
            new Error(`Phase with code ${phaseOrder.code} does not exist`)
          );
        }
      }
      
      // Appliquer la réorganisation
      return await this.phaseRepository.reorderPositions(phaseOrders);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Récupère une phase par son code
   * 
   * @param code Code de la phase
   * @returns Résultat contenant la phase ou une erreur
   */
  async getPhaseByCode(code: string): Promise<Result<Phase, Error>> {
    try {
      return await this.phaseRepository.findByCode(code);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Récupère toutes les phases
   * 
   * @param sortByPosition Tri par position (par défaut: true)
   * @returns Résultat contenant les phases ou une erreur
   */
  async getAllPhases(sortByPosition: boolean = true): Promise<Result<Phase[], Error>> {
    try {
      return await this.phaseRepository.findAll(sortByPosition);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}