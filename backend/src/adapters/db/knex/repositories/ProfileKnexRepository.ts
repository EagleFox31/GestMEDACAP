import { Knex } from 'knex';
import { Profile, ProfileDTO } from '../../../../core/domain/profile/Profile';
import { Result } from '../../../../core/domain/shared/Result';
import { ProfileRepository } from '../../../../ports/db/ProfileRepository';
import { BaseKnexRepository } from '../BaseKnexRepository';

/**
 * Knex implementation of the Profile repository
 */
export class ProfileKnexRepository extends BaseKnexRepository<Profile, ProfileDTO> implements ProfileRepository {
  constructor(db: Knex) {
    super(db, 'profile');
  }

  /**
   * Find a profile by its code
   * @param code Profile code
   */
  async findByCode(code: string): Promise<Result<Profile, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const record = await this.query().where('code', code).first();
        
        if (!record) {
          return Result.failure<Profile, Error>(new Error(`Profile with code ${code} not found`));
        }
        
        return this.toDomain(record);
      });
      
      return result;
    } catch (error) {
      return Result.failure<Profile, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Find all profiles
   * @param sortByName Whether to sort by name (default: true)
   */
  async findAll(sortByName = true): Promise<Result<Profile[], Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const query = this.query();
        
        if (sortByName) {
          query.orderBy('name', 'asc');
        } else {
          query.orderBy('code', 'asc');
        }
        
        const records = await query;
        
        const profiles: Profile[] = [];
        
        for (const record of records) {
          const profileResult = this.toDomain(record);
          if (profileResult.isFailure()) {
            return Result.failure<Profile[], Error>(profileResult.getErrorValue());
          }
          profiles.push(profileResult.getValue());
        }
        
        return Result.success<Profile[], Error>(profiles);
      });
      
      return result;
    } catch (error) {
      return Result.failure<Profile[], Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Save a new profile or update an existing one
   * @param profile Profile to save
   */
  async save(profile: Profile): Promise<Result<Profile, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const dto = this.toDTO(profile);
        const now = new Date();
        
        const exists = await this.query().where('code', dto.code).first();
        
        if (exists) {
          // Update existing profile
          await this.query()
            .where('code', dto.code)
            .update({
              name: dto.name,
              updated_at: now
            });
        } else {
          // Insert new profile
          await this.query().insert({
            code: dto.code,
            name: dto.name,
            created_at: now,
            updated_at: now
          });
        }
        
        return this.findByCode(dto.code);
      });
      
      return result;
    } catch (error) {
      return Result.failure<Profile, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Delete a profile by its code
   * @param code Profile code
   */
  async delete(code: string): Promise<Result<void, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const deleted = await this.query().where('code', code).delete();
        
        if (deleted === 0) {
          return Result.failure<void, Error>(new Error(`Profile with code ${code} not found`));
        }
        
        return Result.success<void, Error>(undefined);
      });
      
      return result;
    } catch (error) {
      return Result.failure<void, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check if a profile with the given code exists
   * @param code Profile code
   */
  async existsByCode(code: string): Promise<Result<boolean, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const exists = await this.query().where('code', code).first();
        return Result.success<boolean, Error>(!!exists);
      });
      
      return result;
    } catch (error) {
      return Result.failure<boolean, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get all profiles for a specific task
   * @param taskId Task ID
   */
  async findByTaskId(taskId: string): Promise<Result<Profile[], Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const records = await this.db('profile')
          .join('task_profile', 'profile.code', 'task_profile.profile_code')
          .where('task_profile.task_id', taskId)
          .select('profile.*');
        
        const profiles: Profile[] = [];
        
        for (const record of records) {
          const profileResult = this.toDomain(record);
          if (profileResult.isFailure()) {
            return Result.failure<Profile[], Error>(profileResult.getErrorValue());
          }
          profiles.push(profileResult.getValue());
        }
        
        return Result.success<Profile[], Error>(profiles);
      });
      
      return result;
    } catch (error) {
      return Result.failure<Profile[], Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Associate profiles with a task
   * @param taskId Task ID
   * @param profileCodes Array of profile codes
   */
  async associateWithTask(taskId: string, profileCodes: string[]): Promise<Result<void, Error>> {
    try {
      const result = await this.transaction(async (trx) => {
        // Remove existing associations
        await trx('task_profile').where('task_id', taskId).delete();
        
        // Add new associations
        if (profileCodes.length > 0) {
          const rows = profileCodes.map(code => ({
            task_id: taskId,
            profile_code: code,
            created_at: new Date()
          }));
          
          await trx('task_profile').insert(rows);
        }
        
        return Result.success<void, Error>(undefined);
      });
      
      return result;
    } catch (error) {
      return Result.failure<void, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Remove profile associations from a task
   * @param taskId Task ID
   * @param profileCodes Array of profile codes (if empty, removes all associations)
   */
  async removeFromTask(taskId: string, profileCodes?: string[]): Promise<Result<void, Error>> {
    try {
      const result = await this.executeQuery(async () => {
        const query = this.db('task_profile').where('task_id', taskId);
        
        if (profileCodes && profileCodes.length > 0) {
          query.whereIn('profile_code', profileCodes);
        }
        
        await query.delete();
        
        return Result.success<void, Error>(undefined);
      });
      
      return result;
    } catch (error) {
      return Result.failure<void, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Maps a database record to a Profile domain entity
   * @param record Database record
   */
  protected toDomain(record: Record<string, any>): Result<Profile, Error> {
    try {
      return Profile.create({
        code: record.code,
        name: record.name
      });
    } catch (error) {
      return Result.failure<Profile, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Maps a Profile domain entity to a database record
   * @param entity Profile
   */
  protected toDTO(entity: Profile): ProfileDTO {
    return entity.toObject();
  }
}