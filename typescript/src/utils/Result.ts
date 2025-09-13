// Result<T> pattern for better error handling
export type Result<T> = Success<T> | Failure;
export type AsyncResult<T> = Promise<Result<T>>;

export interface Success<T> {
  success: true;
  value: T;
}

export interface Failure {
  success: false;
  error: string;
  details?: any;
}

export function Ok<T>(value: T): Success<T> {
  return { success: true, value };
}

export function Err(error: string, details?: any): Failure {
  return { success: false, error, details };
}

export class ResultUtils {
  static ok<T>(value: T): Success<T> {
    return Ok(value);
  }

  static fail(error: string, details?: any): Failure {
    return Err(error, details);
  }

  static isSuccess<T>(result: Result<T>): result is Success<T> {
    return result.success === true;
  }

  static isFailure<T>(result: Result<T>): result is Failure {
    return result.success === false;
  }

  static map<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
    if (ResultUtils.isSuccess(result)) {
      return Ok(fn(result.value));
    }
    return result;
  }

  static flatMap<T, U>(result: Result<T>, fn: (value: T) => Result<U>): Result<U> {
    if (ResultUtils.isSuccess(result)) {
      return fn(result.value);
    }
    return result;
  }

  static async fromPromise<T>(promise: Promise<T>): AsyncResult<T> {
    // This method wraps a promise to return a Result - implementation without try-catch
    return promise
      .then(value => Ok(value))
      .catch(error => Err(
        error instanceof Error ? error.message : 'Unknown error',
        error
      ));
  }

  /**
   * Collect multiple results into a single result
   * If all results are successful, returns Ok with array of values
   * If any result fails, returns the first failure
   */
  static collect<T>(results: Result<T>[]): Result<T[]> {
    const values: T[] = [];
    for (const result of results) {
      if (!result.success) {
        return result; // Return first failure
      }
      values.push(result.value);
    }
    return Ok(values);
  }

  /**
   * Collect multiple async results into a single result
   * If all results are successful, returns Ok with array of values
   * If any result fails, returns the first failure
   */
  static async collectAsync<T>(results: AsyncResult<T>[]): AsyncResult<T[]> {
    const resolvedResults = await Promise.all(results);
    return ResultUtils.collect(resolvedResults);
  }
}