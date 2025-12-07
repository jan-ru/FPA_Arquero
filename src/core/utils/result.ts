/**
 * Result Type for Error Handling
 * 
 * A functional approach to error handling that makes errors explicit
 * and composable, avoiding exceptions and null checks.
 */

/**
 * Result type - represents either success with a value or failure with an error
 */
export type Result<T, E = Error> =
    | { success: true; value: T }
    | { success: false; error: E };

/**
 * Create a successful Result
 */
export const ok = <T>(value: T): Result<T, never> => ({
    success: true,
    value
});

/**
 * Create a failed Result
 */
export const err = <E>(error: E): Result<never, E> => ({
    success: false,
    error
});

/**
 * Map - Transform the value inside a successful Result
 * 
 * @example
 * const result = ok(5);
 * const doubled = map((x: number) => x * 2)(result);
 * // { success: true, value: 10 }
 */
export const map = <T, U, E>(
    fn: (value: T) => U
) => (result: Result<T, E>): Result<U, E> =>
    result.success
        ? ok(fn(result.value))
        : result;

/**
 * FlatMap (andThen) - Chain operations that return Results
 * 
 * @example
 * const divide = (a: number, b: number): Result<number> =>
 *     b === 0 ? err(new Error('Division by zero')) : ok(a / b);
 * 
 * const result = ok(10);
 * const divided = flatMap((x: number) => divide(x, 2))(result);
 * // { success: true, value: 5 }
 */
export const flatMap = <T, U, E>(
    fn: (value: T) => Result<U, E>
) => (result: Result<T, E>): Result<U, E> =>
    result.success
        ? fn(result.value)
        : result;

/**
 * Alias for flatMap - more readable in pipelines
 */
export const andThen = flatMap;

/**
 * MapError - Transform the error inside a failed Result
 */
export const mapError = <T, E, F>(
    fn: (error: E) => F
) => (result: Result<T, E>): Result<T, F> =>
    result.success
        ? result
        : err(fn(result.error));

/**
 * Unwrap - Extract value or throw error
 * Use sparingly - prefer pattern matching
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
    if (result.success) {
        return result.value;
    }
    throw result.error;
};

/**
 * UnwrapOr - Extract value or return default
 * 
 * @example
 * const result = err(new Error('Failed'));
 * const value = unwrapOr(0)(result); // 0
 */
export const unwrapOr = <T, E>(defaultValue: T) => (result: Result<T, E>): T =>
    result.success ? result.value : defaultValue;

/**
 * IsOk - Type guard for successful Results
 */
export const isOk = <T, E>(result: Result<T, E>): result is { success: true; value: T } =>
    result.success;

/**
 * IsErr - Type guard for failed Results
 */
export const isErr = <T, E>(result: Result<T, E>): result is { success: false; error: E } =>
    !result.success;

/**
 * Sequence - Convert an array of Results into a Result of array
 * Fails fast on first error
 * 
 * @example
 * const results = [ok(1), ok(2), ok(3)];
 * const combined = sequence(results);
 * // { success: true, value: [1, 2, 3] }
 */
export const sequence = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
    const values: T[] = [];
    for (const result of results) {
        if (!result.success) {
            return result;
        }
        values.push(result.value);
    }
    return ok(values);
};

/**
 * TryCatch - Wrap a function that might throw into a Result
 * 
 * @example
 * const parse = tryCatch(
 *     (json: string) => JSON.parse(json),
 *     (error) => new Error(`Parse failed: ${error}`)
 * );
 */
export const tryCatch = <T, E = Error>(
    fn: () => T,
    onError: (error: unknown) => E = (e) => e as E
): Result<T, E> => {
    try {
        return ok(fn());
    } catch (error) {
        return err(onError(error));
    }
};

/**
 * FromNullable - Convert a nullable value to a Result
 * 
 * @example
 * const value = fromNullable(
 *     maybeValue,
 *     () => new Error('Value is null')
 * );
 */
export const fromNullable = <T, E = Error>(
    value: T | null | undefined,
    onNull: () => E = () => new Error('Value is null or undefined') as E
): Result<T, E> =>
    value != null ? ok(value) : err(onNull());
