import { Knex } from 'knex';
import { Phase, PhaseDTO } from '../../../../core/domain/phase/Phase';
import { Result } from '../../../../core/domain/shared/Result';
import { PhaseOrder, PhaseRepository } from '../../../../ports/db/PhaseRepository';
import { BaseKnexRepository } from '../BaseKnexRepository';

/**
 * Knex implementation of the Phase repository
 */
export class PhaseKnexRepository extends BaseKnexRepository<Phase, PhaseDTO> implements PhaseRepository {
  constructor(db: Knex) {
    super(db, 'phase');
  }

  /**
   * Find a phase by its code
   * @param code Phase code
   */
  async findByCode(code: string): Promise<Result<Phase, Error>> {
    const result = await this.executeQuery(async () => {
      const record = await this.query().where('code', code).first();
      
      if (!record) {
        return Result.failure<Phase, Error>(new Error(`Phase with code ${code} not found`));
      }
      
      return this.toDomain(record);
    });

    return result;
  }

  /**
   * Find all phases
   * @param sortByPosition Whether to sort by position (default: true)
   */
  async findAll(sortByPosition = true): Promise<Result<Phase[], Error>> {
    const result = await this.executeQuery(async () => {
      const query = this.query();
      
      if (sortByPosition) {
        query.orderBy('position', 'asc');
      } else {
        query.orderBy('code', 'asc');
      }
      
      const records = await query;
      
      const phases: Phase[] = [];
      
      for (const record of records) {
        const phaseResult = this.toDomain(record);
        if (phaseResult.isFailure()) {
          return Result.failure<Phase[], Error>(phaseResult.getErrorValue());
        }
        phases.push(phaseResult.getValue());
      }
      
      return Result.success<Phase[], Error>(phases);
    });

    return result;
  }

  /**
   * Save a new phase or update an existing one
   * @param phase Phase to save
   */
  async save(phase: Phase): Promise<Result<Phase, Error>> {
    const result = await this.executeQuery(async () => {
      const dto = this.toDTO(phase);
      const now = new Date();
      
      const exists = await this.query().where('code', dto.code).first();
      
      if (exists) {
        // Update existing phase
        await this.query()
          .where('code', dto.code)
          .update({
            name: dto.name,
            position: dto.position,
            updated_at: now
          });
      } else {
        // Insert new phase
        await this.query().insert({
          code: dto.code,
          name: dto.name,
          position: dto.position,
          created_at: now,
          updated_at: now
        });
      }
      
      const findResult = await this.findByCode(dto.code);
      if (findResult.isFailure()) {
        return Result.failure<Phase, Error>(findResult.getErrorValue());
      }
      
      return Result.success<Phase, Error>(findResult.getValue());
    });

    return result;
  }

  /**
   * Delete a phase by its code
   * @param code Phase code
   */
  async delete(code: string): Promise<Result<void, Error>> {
    const result = await this.executeQuery(async () => {
      const deleted = await this.query().where('code', code).delete();
      
      if (deleted === 0) {
        return Result.failure<void, Error>(new Error(`Phase with code ${code} not found`));
      }
      
      return Result.success<void, Error>(undefined);
    });

    return result;
  }

  /**
   * Check if a phase with the given code exists
   * @param code Phase code
   */
  async existsByCode(code: string): Promise<Result<boolean, Error>> {
    const result = await this.executeQuery(async () => {
      const exists = await this.query().where('code', code).first();
      return Result.success<boolean, Error>(!!exists);
    });

    return result;
  }

  /**
   * Get the highest position value among all phases
   */
  async getMaxPosition(): Promise<Result<number, Error>> {
    const result = await this.executeQuery(async () => {
      const result = await this.query().max('position as maxPosition').first();
      const maxPosition = result?.maxPosition || 0;
      return Result.success<number, Error>(Number(maxPosition));
    });

    return result;
  }

  /**
   * Reorder phases by updating their positions
   * @param phaseOrders Array of phase codes and their new positions
   */
  async reorderPositions(phaseOrders: PhaseOrder[]): Promise<Result<void, Error>> {
    const result = await this.transaction(async (trx) => {
      for (const order of phaseOrders) {
        await trx('phase')
          .where('code', order.code)
          .update({ position: order.position, updated_at: new Date() });
      }
      
      return Result.success<void, Error>(undefined);
    });

    return result;
  }

  /**
   * Maps a database record to a Phase domain entity
   * @param record Database record
   */
  protected toDomain(record: Record<string, any>): Result<Phase, Error> {
    try {
      return Phase.create({
        code: record.code,
        name: record.name,
        position: record.position
      });
    } catch (error) {
      return Result.failure<Phase, Error>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Maps a Phase domain entity to a database record
   * @param entity Phase
   */
  protected toDTO(entity: Phase): PhaseDTO {
    return entity.toObject();
  }
}