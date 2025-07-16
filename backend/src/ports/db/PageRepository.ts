import { Page } from '../../core/domain/page/Page';
import { Result } from '../../core/domain/shared/Result';

export interface PageRepository {
  /**
   * Find a page by its ID
   * @param id Page ID
   */
  findById(id: number): Promise<Result<Page, Error>>;

  /**
   * Find pages with optional filtering
   * @param filter Filter options
   */
  find(filter?: PageFilter): Promise<Result<Page[], Error>>;

  /**
   * Find all pages for a specific phase
   * @param phaseCode Phase code
   */
  findByPhaseCode(phaseCode: string): Promise<Result<Page[], Error>>;

  /**
   * Save a new page or update an existing one
   * @param page Page to save
   */
  save(page: Page): Promise<Result<Page, Error>>;

  /**
   * Delete a page by its ID
   * @param id Page ID
   */
  delete(id: number): Promise<Result<void, Error>>;

  /**
   * Check if a page with the same title exists in the same phase
   * @param phaseCode Phase code
   * @param title Page title
   * @param excludeId Exclude a specific page ID from the check (for updates)
   */
  existsByPhaseAndTitle(
    phaseCode: string,
    title: string,
    excludeId?: number
  ): Promise<Result<boolean, Error>>;
}

/**
 * Filter options for page queries
 */
export interface PageFilter {
  id?: number;
  phaseCode?: string | string[];
  search?: string; // Full-text search query for title and description
  limit?: number;
  offset?: number;
  sortBy?: 'id' | 'phaseCode' | 'title';
  sortOrder?: 'asc' | 'desc';
}