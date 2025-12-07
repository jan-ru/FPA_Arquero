/**
 * Option Type for Nullable Values
 * 
 * A type-safe way to handle nullable values without null checks.
 * Similar to Maybe in Haskell or Option in Rust.
 */

/**
 * Option type - represents either Some value or None
 */
export type Option<T> =
    | { some: true; value: T }
    | { some: false };

/**
 * Create an Option with a value
 */
export const some = <T>(value: T): Option<T> => ({
    some: true,
    value
});

/**
 * Create an empty Option
 */
export const none = <T>(): Option<T> => ({
    some: false
});

/**
 * Convert a nullable value to an Option
 * 
 * @example
 * const value = fromNullable(maybeValue);
 * if (value.some) {
 *     console.log(value.value);
 * }
 */
export const fromNullable = <T>(value: T | null | undefined): Option<T> =>
    value != null ? some(value) : none();

/**
 * Map - Transform the value inside Some
 * 
 * @example
 * const value = some(5);
 * const doubled = map((x: number) => x * 2)(value);
 * // { some: true, value: 10 }
 */
export const map = <T, U>(fn: (value: T) => U) => (option: Option<T>): Option<U> =>
    option.some ? some(fn(option.value)) : none();

/**
 * FlatMap - Chain operations that return Options
 * 
 * @example
 * const divide = (a: number, b: number): Option<number> =>
 *     b === 0 ? none() : some(a / b);
 * 
 * const value = some(10);
 * const result = flatMap((x: number) => divide(x, 2))(value);
 * // { some: true, value: 5 }
 */
export const flatMap = <T, U>(fn: (value: T) => Option<U>) => (option: Option<T>): Option<U> =>
    option.some ? fn(option.value) : none();

/**
 * GetOrElse - Extract value or return default
 * 
 * @example
 * const value = none<number>();
 * const result = getOrElse(0)(value); // 0
 */
export const getOrElse = <T>(defaultValue: T) => (option: Option<T>): T =>
    option.some ? option.value : defaultValue;

/**
 * Filter - Keep Some only if predicate is true
 * 
 * @example
 * const value = some(5);
 * const filtered = filter((x: number) => x > 3)(value);
 * // { some: true, value: 5 }
 */
export const filter = <T>(predicate: (value: T) => boolean) => (option: Option<T>): Option<T> =>
    option.some && predicate(option.value) ? option : none();

/**
 * IsSome - Type guard for Some
 */
export const isSome = <T>(option: Option<T>): option is { some: true; value: T } =>
    option.some;

/**
 * IsNone - Type guard for None
 */
export const isNone = <T>(option: Option<T>): option is { some: false } =>
    !option.some;

/**
 * Match - Pattern matching for Options
 * 
 * @example
 * const value = some(5);
 * const result = match(
 *     (x) => `Value is ${x}`,
 *     () => 'No value'
 * )(value);
 * // "Value is 5"
 */
export const match = <T, R>(
    onSome: (value: T) => R,
    onNone: () => R
) => (option: Option<T>): R =>
    option.some ? onSome(option.value) : onNone();

/**
 * ToNullable - Convert Option to nullable value
 */
export const toNullable = <T>(option: Option<T>): T | null =>
    option.some ? option.value : null;

/**
 * Sequence - Convert array of Options to Option of array
 * Returns None if any element is None
 * 
 * @example
 * const options = [some(1), some(2), some(3)];
 * const result = sequence(options);
 * // { some: true, value: [1, 2, 3] }
 */
export const sequence = <T>(options: Option<T>[]): Option<T[]> => {
    const values: T[] = [];
    for (const option of options) {
        if (!option.some) {
            return none();
        }
        values.push(option.value);
    }
    return some(values);
};
