import { Knex } from 'knex';
import { Result } from '../../../core/domain/shared/Result';

/**
 * Base repository class providing common functionality for Knex repositories
 */
export abstract class BaseKnexRepository<T, DTO> {
  protected readonly db: Knex;
  protected readonly tableName: string;

  constructor(db: Knex, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * Creates a query builder for the repository's table
   */
  protected query(): Knex.QueryBuilder {
    return this.db(this.tableName);
  }

  /**
   * Maps a database record to a domain entity
   * @param record Database record
   */
  protected abstract toDomain(record: Record<string, any>): Result<T, Error>;

  /**
   * Maps a domain entity to a database record
   * @param entity Domain entity
   */
  protected abstract toDTO(entity: T): DTO;

  /**
   * Creates a transaction
   */
  protected async transaction<TResult>(
    callback: (trx: Knex.Transaction) => Promise<Result<TResult, Error>>
  ): Promise<Result<TResult, Error>> {
    try {
      const result = await this.db.transaction(callback);
      return result;
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Executes a query and handles errors
   */
  protected async executeQuery<TResult>(
    queryFn: () => Promise<Result<TResult, Error>>
  ): Promise<Result<TResult, Error>> {
    try {
      const result = await queryFn();
      return result;
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}