import { Knex } from 'knex';
import { Page, PageDTO } from '../../../../core/domain/page/Page';
import { Result } from '../../../../core/domain/shared/Result';
import { PageFilter, PageRepository } from '../../../../ports/db/PageRepository';
import { BaseKnexRepository } from '../BaseKnexRepository';

/**
 * Knex implementation of the Page repository
 */
export class PageKnexRepository extends BaseKnexRepository<Page, PageDTO> implements PageRepository {
  constructor(db: Knex) {
    super(db, 'page');
  }

  /**
   * Find a page by its ID
   * @param id Page ID
   */
  async findById(id: number): Promise<Result<Page, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const record = await this.query().where('id', id).first();
        
        if (!record) {
          return Result.failure<Page, Error>(new Error(`Page with ID ${id} not found`));
        }
        
        return this.toDomain(record);
      });
      
      return result;
    } catch (error) {
      return Result.failure<Page, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Find pages with optional filtering
   * @param filter Filter options
   */
  async find(filter?: PageFilter): Promise<Result<Page[], Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const query = this.query();
        
        // Apply filters if provided
        if (filter) {
          if (filter.id !== undefined) {
            query.where('id', filter.id);
          }
          
          if (filter.phaseCode !== undefined) {
            if (Array.isArray(filter.phaseCode)) {
              query.whereIn('phase_code', filter.phaseCode);
            } else {
              query.where('phase_code', filter.phaseCode);
            }
          }
          
          if (filter.search) {
            query.where(function() {
              this.where('title', 'ILIKE', `%${filter.search}%`)
                .orWhere('description', 'ILIKE', `%${filter.search}%`);
            });
          }
          
          // Apply sorting
          const sortBy = filter.sortBy || 'id';
          const sortOrder = filter.sortOrder || 'asc';
          
          if (sortBy === 'id') {
            query.orderBy('id', sortOrder);
          } else if (sortBy === 'phaseCode') {
            query.orderBy('phase_code', sortOrder);
          } else if (sortBy === 'title') {
            query.orderBy('title', sortOrder);
          }
          
          // Apply pagination
          if (filter.limit !== undefined) {
            query.limit(filter.limit);
            
            if (filter.offset !== undefined) {
              query.offset(filter.offset);
            }
          }
        }
        
        const records = await query;
        
        const pages: Page[] = [];
        
        for (const record of records) {
          const pageResult = this.toDomain(record);
          if (pageResult.isFailure()) {
            return Result.failure<Page[], Error>(pageResult.getErrorValue());
          }
          pages.push(pageResult.getValue());
        }
        
        return Result.success<Page[], Error>(pages);
      });
      
      return result;
    } catch (error) {
      return Result.failure<Page[], Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Find all pages for a specific phase
   * @param phaseCode Phase code
   */
  async findByPhaseCode(phaseCode: string): Promise<Result<Page[], Error>> {
    try {
      return this.find({ phaseCode });
    } catch (error) {
      return Result.failure<Page[], Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Save a new page or update an existing one
   * @param page Page to save
   */
  async save(page: Page): Promise<Result<Page, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const dto = this.toDTO(page);
        const now = new Date();
        
        if (dto.id) {
          // Update existing page
          await this.query()
            .where('id', dto.id)
            .update({
              phase_code: dto.phaseCode,
              title: dto.title,
              description: dto.description,
              updated_at: now
            });
            
          return this.findById(dto.id);
        } else {
          // Insert new page
          const [id] = await this.query().insert({
            phase_code: dto.phaseCode,
            title: dto.title,
            description: dto.description,
            created_at: now,
            updated_at: now
          }).returning('id');
          
          return this.findById(id);
        }
      });
      
      return result;
    } catch (error) {
      return Result.failure<Page, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete a page by its ID
   * @param id Page ID
   */
  async delete(id: number): Promise<Result<void, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const deleted = await this.query().where('id', id).delete();
        
        if (deleted === 0) {
          return Result.failure<void, Error>(new Error(`Page with ID ${id} not found`));
        }
        
        return Result.success<void, Error>(undefined);
      });
      
      return result;
    } catch (error) {
      return Result.failure<void, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check if a page with the same title exists in the same phase
   * @param phaseCode Phase code
   * @param title Page title
   * @param excludeId Exclude a specific page ID from the check (for updates)
   */
  async existsByPhaseAndTitle(
    phaseCode: string,
    title: string,
    excludeId?: number
  ): Promise<Result<boolean, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const query = this.query()
          .where('phase_code', phaseCode)
          .where('title', title);
        
        if (excludeId) {
          query.whereNot('id', excludeId);
        }
        
        const exists = await query.first();
        return Result.success<boolean, Error>(!!exists);
      });
      
      return result;
    } catch (error) {
      return Result.failure<boolean, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Maps a database record to a Page domain entity
   * @param record Database record
   */
  protected toDomain(record: Record<string, any>): Result<Page, Error> {
    try {
      return Page.create({
        id: record.id,
        phaseCode: record.phase_code,
        title: record.title,
        description: record.description
      });
    } catch (error) {
      return Result.failure<Page, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Maps a Page domain entity to a database record
   * @param entity Page
   */
  protected toDTO(entity: Page): PageDTO {
    return entity.toObject();
  }
}