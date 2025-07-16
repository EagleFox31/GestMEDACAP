import { Phase } from '../../core/domain/phase/Phase';
import { Result } from '../../core/domain/shared/Result';

export interface PhaseRepository {
  /**
   * Find a phase by its code
   * @param code Phase code
   */
  findByCode(code: string): Promise<Result<Phase, Error>>;

  /**
   * Find all phases
   * @param sortByPosition Whether to sort by position (default: true)
   */
  findAll(sortByPosition?: boolean): Promise<Result<Phase[], Error>>;

  /**
   * Save a new phase or update an existing one
   * @param phase Phase to save
   */
  save(phase: Phase): Promise<Result<Phase, Error>>;

  /**
   * Delete a phase by its code
   * @param code Phase code
   */
  delete(code: string): Promise<Result<void, Error>>;

  /**
   * Check if a phase with the given code exists
   * @param code Phase code
   */
  existsByCode(code: string): Promise<Result<boolean, Error>>;

  /**
   * Get the highest position value among all phases
   */
  getMaxPosition(): Promise<Result<number, Error>>;

  /**
   * Reorder phases by updating their positions
   * @param phaseOrders Array of phase codes and their new positions
   */
  reorderPositions(phaseOrders: PhaseOrder[]): Promise<Result<void, Error>>;
}

/**
 * Phase order for reordering
 */
export interface PhaseOrder {
  code: string;
  position: number;
}