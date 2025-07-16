import { Profile } from '../../core/domain/profile/Profile';
import { Result } from '../../core/domain/shared/Result';
import { DbTransaction } from './TaskRepository';

export interface ProfileRepository {
  /**
   * Find a profile by its code
   * @param code Profile code
   */
  findByCode(code: string): Promise<Result<Profile, Error>>;

  /**
   * Find all profiles
   * @param sortByName Whether to sort by name (default: true)
   */
  findAll(sortByName?: boolean): Promise<Result<Profile[], Error>>;

  /**
   * Save a new profile or update an existing one
   * @param profile Profile to save
   */
  save(profile: Profile, trx?: DbTransaction): Promise<Result<Profile, Error>>;

  /**
   * Delete a profile by its code
   * @param code Profile code
   */
  delete(code: string, trx?: DbTransaction): Promise<Result<void, Error>>;

  /**
   * Check if a profile with the given code exists
   * @param code Profile code
   */
  existsByCode(code: string): Promise<Result<boolean, Error>>;

  /**
   * Get all profiles for a specific task
   * @param taskId Task ID
   */
  findByTaskId(taskId: string): Promise<Result<Profile[], Error>>;

  /**
   * Associate profiles with a task
   * @param taskId Task ID
   * @param profileCodes Array of profile codes
   */
  associateWithTask(taskId: string, profileCodes: string[], trx?: DbTransaction): Promise<Result<void, Error>>;

  /**
   * Remove profile associations from a task
   * @param taskId Task ID
   * @param profileCodes Array of profile codes (if empty, removes all associations)
   */
  removeFromTask(taskId: string, profileCodes?: string[], trx?: DbTransaction): Promise<Result<void, Error>>;
}