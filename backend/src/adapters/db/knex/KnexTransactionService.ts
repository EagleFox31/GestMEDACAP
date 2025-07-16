import { Knex } from 'knex';
import { Result } from '../../../core/domain/shared/Result';

/**
 * Service permettant d'exécuter des opérations dans une transaction Knex
 */
export class KnexTransactionService {
  constructor(private readonly db: Knex) {}

  /**
   * Exécute une fonction dans une transaction
   * 
   * @param handler Fonction à exécuter dans une transaction
   * @returns Résultat de la fonction
   */
  async executeInTransaction<T>(
    handler: (trx: Knex.Transaction) => Promise<Result<T, Error>>
  ): Promise<Result<T, Error>> {
    try {
      const result = await this.db.transaction(async (trx) => {
        const opResult = await handler(trx);
        
        if (opResult.isFailure()) {
          throw opResult.getErrorValue();
        }
        
        return opResult.getValue();
      });
      
      return Result.success(result);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}