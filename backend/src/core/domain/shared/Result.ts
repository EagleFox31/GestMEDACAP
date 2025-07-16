/**
 * Result pattern for handling success/failure responses
 * without throwing exceptions, inspired by functional programming
 */
export class Result<T, E = Error> {
  private readonly _isSuccess: boolean;
  private readonly _error: E | null;
  private readonly _value: T | null;

  private constructor(isSuccess: boolean, error: E | null, value: T | null) {
    this._isSuccess = isSuccess;
    this._error = error;
    this._value = value;

    // Freeze the object to prevent modification
    Object.freeze(this);
  }

  /**
   * Check if the result is a success
   */
  public isSuccess(): boolean {
    return this._isSuccess;
  }

  /**
   * Check if the result is a failure
   */
  public isFailure(): boolean {
    return !this._isSuccess;
  }

  /**
   * Get the value from the result
   * @throws Error if the result is a failure
   */
  public getValue(): T {
    if (!this._isSuccess) {
      throw new Error(
        'Cannot get value from failure result. Use getErrorValue() instead.'
      );
    }

    return this._value as T;
  }

  /**
   * Get the error from the result
   * @throws Error if the result is a success
   */
  public getErrorValue(): E {
    if (this._isSuccess) {
      throw new Error(
        'Cannot get error from success result. Use getValue() instead.'
      );
    }

    return this._error as E;
  }

  /**
   * Create a success result
   */
  public static success<T, E = Error>(value: T): Result<T, E> {
    return new Result<T, E>(true, null, value);
  }

  /**
   * Create a failure result
   */
  public static failure<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, error, null);
  }

  /**
   * Map the result to a new result with a different value type
   */
  public map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.isFailure()) {
      return Result.failure<U, E>(this._error as E);
    }

    return Result.success<U, E>(fn(this._value as T));
  }

  /**
   * Chain results (flatMap)
   */
  public flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.isFailure()) {
      return Result.failure<U, E>(this._error as E);
    }

    return fn(this._value as T);
  }

  /**
   * Handle both success and failure cases
   */
  public match<U>(
    onSuccess: (value: T) => U,
    onFailure: (error: E) => U
  ): U {
    if (this.isSuccess()) {
      return onSuccess(this._value as T);
    }
    return onFailure(this._error as E);
  }
}