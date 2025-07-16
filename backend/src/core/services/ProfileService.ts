import { Profile, ProfileDTO, KNOWN_PROFILE_CODES } from '../domain/profile/Profile';
import { Result } from '../domain/shared/Result';
import { ProfileRepository } from '../../ports/db/ProfileRepository';
import { TaskRepository } from '../../ports/db/TaskRepository';

/**
 * Interface pour les données d'entrée de création d'un profil
 */
export interface CreateProfileInput {
  code: string;
  name: string;
}

/**
 * Interface pour les données de mise à jour d'un profil
 */
export interface UpdateProfileInput {
  name: string;
}

/**
 * Interface pour la réponse de création d'un profil
 */
export interface CreateProfileResponse {
  profile: ProfileDTO;
  message: string;
}

/**
 * Interface pour la réponse de mise à jour d'un profil
 */
export interface UpdateProfileResponse {
  profile: ProfileDTO;
  message: string;
}

/**
 * Interface pour la réponse enrichie d'un profil avec ses tâches associées
 */
export interface ProfileWithTasksDTO extends ProfileDTO {
  taskCount?: number;
}

/**
 * ProfileService - Service responsable de la gestion des profils MEDACAP
 * 
 * Ce service implémente toutes les opérations liées aux profils:
 * - Création et mise à jour des profils
 * - Gestion des associations entre profils et tâches
 * - Vérification des contraintes métier liées aux profils
 */
export class ProfileService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly taskRepository: TaskRepository
  ) {}

  /**
   * Crée un nouveau profil
   * 
   * @param input Données du profil à créer
   * @param userRole Rôle de l'utilisateur effectuant la création
   * @returns Résultat contenant la réponse de création ou une erreur
   */
  async createProfile(
    input: CreateProfileInput, 
    userRole: string
  ): Promise<Result<CreateProfileResponse, Error>> {
    try {
      // Vérifier les permissions - seuls CP et RF peuvent créer des profils
      if (!['CP', 'RF'].includes(userRole)) {
        return Result.failure(
          new Error('Forbidden - only CP or RF roles can create profiles')
        );
      }

      // Vérifier si un profil avec ce code existe déjà
      const existsResult = await this.profileRepository.existsByCode(input.code);
      
      if (existsResult.isFailure()) {
        return Result.failure(existsResult.getErrorValue());
      }
      
      if (existsResult.getValue()) {
        return Result.failure(
          new Error(`Profile with code ${input.code} already exists`)
        );
      }

      // Créer le profil
      const profileCreateResult = Profile.create({
        code: input.code,
        name: input.name
      });

      if (profileCreateResult.isFailure()) {
        return Result.failure(profileCreateResult.getErrorValue());
      }

      const profile = profileCreateResult.getValue();
      
      // Persister le profil
      const savedProfileResult = await this.profileRepository.save(profile);
      
      if (savedProfileResult.isFailure()) {
        return Result.failure(savedProfileResult.getErrorValue());
      }
      
      const savedProfile = savedProfileResult.getValue();
      
      // Créer la réponse
      const response: CreateProfileResponse = {
        profile: savedProfile.toObject(),
        message: 'Profil créé avec succès'
      };
      
      return Result.success(response);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Met à jour un profil existant
   * 
   * @param code Code du profil à mettre à jour
   * @param input Données de mise à jour
   * @param userRole Rôle de l'utilisateur
   * @returns Résultat contenant la réponse de mise à jour ou une erreur
   */
  async updateProfile(
    code: string, 
    input: UpdateProfileInput, 
    userRole: string
  ): Promise<Result<UpdateProfileResponse, Error>> {
    try {
      // Vérifier les permissions - seuls CP et RF peuvent modifier des profils
      if (!['CP', 'RF'].includes(userRole)) {
        return Result.failure(
          new Error('Forbidden - only CP or RF roles can update profiles')
        );
      }

      // Vérifier les restrictions pour les profils standard
      if (KNOWN_PROFILE_CODES.includes(code)) {
        return Result.failure(
          new Error(`Cannot modify standard profile ${code}`)
        );
      }

      // Récupérer le profil
      const profileResult = await this.profileRepository.findByCode(code);
      
      if (profileResult.isFailure()) {
        return Result.failure(profileResult.getErrorValue());
      }
      
      const profile = profileResult.getValue();
      
      // Mettre à jour le nom
      const nameResult = profile.updateName(input.name);
      if (nameResult.isFailure()) {
        return Result.failure(nameResult.getErrorValue());
      }
      
      // Persister les modifications
      const updatedProfileResult = await this.profileRepository.save(profile);
      
      if (updatedProfileResult.isFailure()) {
        return Result.failure(updatedProfileResult.getErrorValue());
      }
      
      const updatedProfile = updatedProfileResult.getValue();
      
      // Créer la réponse
      const response: UpdateProfileResponse = {
        profile: updatedProfile.toObject(),
        message: 'Profil mis à jour avec succès'
      };
      
      return Result.success(response);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Supprime un profil
   * 
   * @param code Code du profil à supprimer
   * @param userRole Rôle de l'utilisateur
   * @returns Résultat de succès ou erreur
   */
  async deleteProfile(code: string, userRole: string): Promise<Result<void, Error>> {
    try {
      // Vérifier les permissions - seuls CP et RF peuvent supprimer des profils
      if (!['CP', 'RF'].includes(userRole)) {
        return Result.failure(
          new Error('Forbidden - only CP or RF roles can delete profiles')
        );
      }

      // Vérifier les restrictions pour les profils standard
      if (KNOWN_PROFILE_CODES.includes(code)) {
        return Result.failure(
          new Error(`Cannot delete standard profile ${code}`)
        );
      }

      // Vérifier que le profil existe
      const profileResult = await this.profileRepository.findByCode(code);
      
      if (profileResult.isFailure()) {
        return Result.failure(profileResult.getErrorValue());
      }
      
      // Vérifier si des tâches sont associées à ce profil
      // Remarque: Cette fonctionnalité nécessiterait une méthode pour compter les tâches par profil
      // que nous n'avons pas actuellement. Pour le moment, nous supposerons qu'il n'y a pas de restriction.
      
      // Supprimer le profil
      return await this.profileRepository.delete(code);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Associe des profils à une tâche
   * 
   * @param taskId ID de la tâche
   * @param profileCodes Codes des profils à associer
   * @param userRole Rôle de l'utilisateur
   * @returns Résultat de succès ou erreur
   */
  async associateProfilesWithTask(
    taskId: string,
    profileCodes: string[],
    userRole: string
  ): Promise<Result<void, Error>> {
    try {
      // Vérifier les permissions - seuls CP, RF et R/A peuvent associer des profils
      // Note: Cette vérification devrait idéalement utiliser le service de tâche pour vérifier
      // si l'utilisateur a les droits R ou A sur la tâche spécifique
      if (!['CP', 'RF'].includes(userRole)) {
        return Result.failure(
          new Error('Forbidden - only CP or RF roles can associate profiles with tasks')
        );
      }

      // Vérifier que la tâche existe
      const taskResult = await this.taskRepository.findById(taskId);
      
      if (taskResult.isFailure()) {
        return Result.failure(taskResult.getErrorValue());
      }
      
      // Vérifier que tous les profils existent
      for (const code of profileCodes) {
        const profileResult = await this.profileRepository.findByCode(code);
        
        if (profileResult.isFailure()) {
          return Result.failure(
            new Error(`Profile with code ${code} not found`)
          );
        }
      }
      
      // Associer les profils à la tâche
      return await this.profileRepository.associateWithTask(taskId, profileCodes);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Dissocie des profils d'une tâche
   * 
   * @param taskId ID de la tâche
   * @param profileCodes Codes des profils à dissocier (si vide, dissocie tous les profils)
   * @param userRole Rôle de l'utilisateur
   * @returns Résultat de succès ou erreur
   */
  async removeProfilesFromTask(
    taskId: string,
    profileCodes: string[] | undefined,
    userRole: string
  ): Promise<Result<void, Error>> {
    try {
      // Vérifier les permissions - seuls CP, RF et R/A peuvent dissocier des profils
      // Note: Cette vérification devrait idéalement utiliser le service de tâche pour vérifier
      // si l'utilisateur a les droits R ou A sur la tâche spécifique
      if (!['CP', 'RF'].includes(userRole)) {
        return Result.failure(
          new Error('Forbidden - only CP or RF roles can remove profiles from tasks')
        );
      }

      // Vérifier que la tâche existe
      const taskResult = await this.taskRepository.findById(taskId);
      
      if (taskResult.isFailure()) {
        return Result.failure(taskResult.getErrorValue());
      }
      
      // Vérifier que tous les profils existent (si des codes sont fournis)
      if (profileCodes && profileCodes.length > 0) {
        for (const code of profileCodes) {
          const profileResult = await this.profileRepository.findByCode(code);
          
          if (profileResult.isFailure()) {
            return Result.failure(
              new Error(`Profile with code ${code} not found`)
            );
          }
        }
      }
      
      // Dissocier les profils de la tâche
      return await this.profileRepository.removeFromTask(taskId, profileCodes);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Récupère un profil par son code
   * 
   * @param code Code du profil
   * @returns Résultat contenant le profil ou une erreur
   */
  async getProfileByCode(code: string): Promise<Result<Profile, Error>> {
    try {
      return await this.profileRepository.findByCode(code);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Récupère tous les profils
   * 
   * @param sortByName Tri par nom (par défaut: true)
   * @returns Résultat contenant les profils ou une erreur
   */
  async getAllProfiles(sortByName: boolean = true): Promise<Result<Profile[], Error>> {
    try {
      return await this.profileRepository.findAll(sortByName);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Récupère tous les profils associés à une tâche
   * 
   * @param taskId ID de la tâche
   * @returns Résultat contenant les profils ou une erreur
   */
  async getProfilesByTaskId(taskId: string): Promise<Result<Profile[], Error>> {
    try {
      return await this.profileRepository.findByTaskId(taskId);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}