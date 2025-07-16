import { Page, PageDTO } from '../domain/page/Page';
import { Result } from '../domain/shared/Result';
import { PageRepository, PageFilter } from '../../ports/db/PageRepository';
import { PhaseRepository } from '../../ports/db/PhaseRepository';

/**
 * Interface pour les données d'entrée de création d'une page
 */
export interface CreatePageInput {
  phaseCode: string;
  title: string;
  description?: string;
}

/**
 * Interface pour les données de mise à jour d'une page
 */
export interface UpdatePageInput {
  phaseCode?: string;
  title?: string;
  description?: string;
}

/**
 * Interface pour la réponse de création d'une page
 */
export interface CreatePageResponse {
  page: PageDTO;
  message: string;
}

/**
 * Interface pour la réponse de mise à jour d'une page
 */
export interface UpdatePageResponse {
  page: PageDTO;
  message: string;
}

/**
 * PageService - Service responsable de la gestion des pages MEDACAP
 * 
 * Ce service implémente toutes les opérations liées aux pages:
 * - Création et mise à jour des pages
 * - Récupération des pages par phase ou avec filtrage
 * - Vérification des contraintes métier liées aux pages
 */
export class PageService {
  constructor(
    private readonly pageRepository: PageRepository,
    private readonly phaseRepository: PhaseRepository
  ) {}

  /**
   * Crée une nouvelle page
   * 
   * @param input Données de la page à créer
   * @param creatorUuid UUID de l'utilisateur créant la page
   * @param userRole Rôle de l'utilisateur
   * @returns Résultat contenant la réponse de création ou une erreur
   */
  async createPage(
    input: CreatePageInput,
    creatorUuid: string,
    userRole: string
  ): Promise<Result<CreatePageResponse, Error>> {
    try {
      // Vérifier les permissions - seuls CP et RF peuvent créer des pages
      if (!['CP', 'RF'].includes(userRole)) {
        return Result.failure(
          new Error('Forbidden - only CP or RF roles can create pages')
        );
      }

      // Vérifier que la phase existe
      const phaseResult = await this.phaseRepository.findByCode(input.phaseCode);
      
      if (phaseResult.isFailure()) {
        return Result.failure(
          new Error(`Phase with code ${input.phaseCode} not found`)
        );
      }

      // Vérifier qu'il n'y a pas déjà une page avec ce titre dans cette phase
      const existsResult = await this.pageRepository.existsByPhaseAndTitle(
        input.phaseCode,
        input.title
      );
      
      if (existsResult.isFailure()) {
        return Result.failure(existsResult.getErrorValue());
      }
      
      if (existsResult.getValue()) {
        return Result.failure(
          new Error(`A page with title "${input.title}" already exists in phase ${input.phaseCode}`)
        );
      }

      // Créer la page
      const pageCreateResult = Page.create({
        phaseCode: input.phaseCode,
        title: input.title,
        description: input.description,
        createdBy: creatorUuid,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      if (pageCreateResult.isFailure()) {
        return Result.failure(pageCreateResult.getErrorValue());
      }

      const page = pageCreateResult.getValue();
      
      // Persister la page
      const savedPageResult = await this.pageRepository.save(page);
      
      if (savedPageResult.isFailure()) {
        return Result.failure(savedPageResult.getErrorValue());
      }
      
      const savedPage = savedPageResult.getValue();
      
      // Créer la réponse
      const response: CreatePageResponse = {
        page: savedPage.toObject(),
        message: 'Page créée avec succès'
      };
      
      return Result.success(response);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Met à jour une page existante
   * 
   * @param id ID de la page à mettre à jour
   * @param input Données de mise à jour
   * @param userRole Rôle de l'utilisateur
   * @returns Résultat contenant la réponse de mise à jour ou une erreur
   */
  async updatePage(
    id: number,
    input: UpdatePageInput,
    userRole: string
  ): Promise<Result<UpdatePageResponse, Error>> {
    try {
      // Vérifier les permissions - seuls CP et RF peuvent modifier des pages
      if (!['CP', 'RF'].includes(userRole)) {
        return Result.failure(
          new Error('Forbidden - only CP or RF roles can update pages')
        );
      }

      // Récupérer la page
      const pageResult = await this.pageRepository.findById(id);
      
      if (pageResult.isFailure()) {
        return Result.failure(pageResult.getErrorValue());
      }
      
      const page = pageResult.getValue();
      
      // Si modification de la phase, vérifier que la nouvelle phase existe
      if (input.phaseCode !== undefined && input.phaseCode !== page.getPhaseCode()) {
        const phaseResult = await this.phaseRepository.findByCode(input.phaseCode);
        
        if (phaseResult.isFailure()) {
          return Result.failure(
            new Error(`Phase with code ${input.phaseCode} not found`)
          );
        }
        
        const phaseResult2 = page.updatePhase(input.phaseCode);
        if (phaseResult2.isFailure()) {
          return Result.failure(phaseResult2.getErrorValue());
        }
      }
      
      // Si modification du titre, vérifier l'unicité dans la phase
      if (input.title !== undefined && input.title !== page.getTitle()) {
        const phaseCode = input.phaseCode !== undefined ? input.phaseCode : page.getPhaseCode();
        
        const existsResult = await this.pageRepository.existsByPhaseAndTitle(
          phaseCode,
          input.title,
          id // Exclure cette page de la vérification
        );
        
        if (existsResult.isFailure()) {
          return Result.failure(existsResult.getErrorValue());
        }
        
        if (existsResult.getValue()) {
          return Result.failure(
            new Error(`A page with title "${input.title}" already exists in phase ${phaseCode}`)
          );
        }
        
        const titleResult = page.updateTitle(input.title);
        if (titleResult.isFailure()) {
          return Result.failure(titleResult.getErrorValue());
        }
      }
      
      // Mise à jour de la description
      if (input.description !== undefined) {
        const descResult = page.updateDescription(input.description);
        if (descResult.isFailure()) {
          return Result.failure(descResult.getErrorValue());
        }
      }
      
      // Persister les modifications
      const updatedPageResult = await this.pageRepository.save(page);
      
      if (updatedPageResult.isFailure()) {
        return Result.failure(updatedPageResult.getErrorValue());
      }
      
      const updatedPage = updatedPageResult.getValue();
      
      // Créer la réponse
      const response: UpdatePageResponse = {
        page: updatedPage.toObject(),
        message: 'Page mise à jour avec succès'
      };
      
      return Result.success(response);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Supprime une page
   * 
   * @param id ID de la page à supprimer
   * @param userRole Rôle de l'utilisateur
   * @returns Résultat de succès ou erreur
   */
  async deletePage(id: number, userRole: string): Promise<Result<void, Error>> {
    try {
      // Vérifier les permissions - seuls CP et RF peuvent supprimer des pages
      if (!['CP', 'RF'].includes(userRole)) {
        return Result.failure(
          new Error('Forbidden - only CP or RF roles can delete pages')
        );
      }

      // Vérifier que la page existe
      const pageResult = await this.pageRepository.findById(id);
      
      if (pageResult.isFailure()) {
        return Result.failure(pageResult.getErrorValue());
      }
      
      // Vérifier si des tâches sont associées à cette page
      // Note: Cette vérification nécessiterait une méthode dans le repository de tâches
      // que nous n'avons pas actuellement, mais il serait recommandé de l'implémenter
      
      // Supprimer la page
      return await this.pageRepository.delete(id);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Récupère une page par son ID
   * 
   * @param id ID de la page
   * @returns Résultat contenant la page ou une erreur
   */
  async getPageById(id: number): Promise<Result<Page, Error>> {
    try {
      return await this.pageRepository.findById(id);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Récupère toutes les pages d'une phase
   * 
   * @param phaseCode Code de la phase
   * @returns Résultat contenant les pages ou une erreur
   */
  async getPagesByPhase(phaseCode: string): Promise<Result<Page[], Error>> {
    try {
      return await this.pageRepository.findByPhaseCode(phaseCode);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Récupère les pages avec filtrage
   * 
   * @param filter Options de filtrage
   * @returns Résultat contenant les pages ou une erreur
   */
  async findPages(filter: PageFilter = {}): Promise<Result<Page[], Error>> {
    try {
      return await this.pageRepository.find(filter);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}