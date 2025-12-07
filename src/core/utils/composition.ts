/**
 * Function Composition Utilities
 * 
 * Provides core functional programming composition patterns for building
 * complex operations from simple, reusable functions.
 */

/**
 * Pipe - Left-to-right function composition
 * Applies functions in sequence, passing the result of each to the next
 * 
 * @example
 * const transform = pipe(
 *   (x: number) => x + 1,
 *   (x: number) => x * 2,
 *   (x: number) => x.toString()
 * );
 * transform(5); // "12"
 */
export const pipe = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
    fns.reduce((acc, fn) => fn(acc), value);

/**
 * Compose - Right-to-left function composition
 * Like pipe, but applies functions in reverse order
 * 
 * @example
 * const transform = compose(
 *   (x: number) => x.toString(),
 *   (x: number) => x * 2,
 *   (x: number) => x + 1
 * );
 * transform(5); // "12"
 */
export const compose = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
    fns.reduceRight((acc, fn) => fn(acc), value);

/**
 * Curry - Convert a 2-argument function into a curried function
 * 
 * @example
 * const add = curry((a: number, b: number) => a + b);
 * const add5 = add(5);
 * add5(3); // 8
 */
export const curry = <A, B, C>(fn: (a: A, b: B) => C) => 
    (a: A) => (b: B): C => fn(a, b);

/**
 * Curry3 - Convert a 3-argument function into a curried function
 * 
 * @example
 * const sum3 = curry3((a: number, b: number, c: number) => a + b + c);
 * const add5 = sum3(5);
 * const add5and3 = add5(3);
 * add5and3(2); // 10
 */
export const curry3 = <A, B, C, D>(fn: (a: A, b: B, c: C) => D) => 
    (a: A) => (b: B) => (c: C): D => fn(a, b, c);

/**
 * Identity - Returns its argument unchanged
 * Useful as a default function or for testing
 */
export const identity = <T>(x: T): T => x;

/**
 * Constant - Returns a function that always returns the same value
 * 
 * @example
 * const always5 = constant(5);
 * always5(); // 5
 * always5(10); // 5
 */
export const constant = <T>(value: T) => (): T => value;

/**
 * Tap - Execute a side effect and return the original value
 * Useful for debugging in pipelines
 * 
 * @example
 * const result = pipe(
 *   (x: number) => x + 1,
 *   tap(x => console.log('After add:', x)),
 *   (x: number) => x * 2
 * )(5);
 */
export const tap = <T>(fn: (value: T) => void) => (value: T): T => {
    fn(value);
    return value;
};
