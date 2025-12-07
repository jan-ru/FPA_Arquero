/**
 * Core Functional Programming Utilities
 * 
 * This module provides foundational FP utilities for the application:
 * - Option: Type-safe nullable value handling
 * - Result: Functional error handling
 * - Composition: Function composition and currying
 * - Memoization: Performance optimization through caching
 */

// Option type and utilities
export type { Option } from './option.ts';
export {
    some,
    none,
    fromNullable as optionFromNullable,
    map as optionMap,
    flatMap as optionFlatMap,
    getOrElse,
    filter as optionFilter,
    isSome,
    isNone,
    match as optionMatch,
    toNullable,
    sequence as optionSequence
} from './option.ts';

// Result type and utilities
export type { Result } from './result.ts';
export {
    ok,
    err,
    map as resultMap,
    flatMap as resultFlatMap,
    andThen,
    mapError,
    unwrap,
    unwrapOr,
    isOk,
    isErr,
    getError,
    sequence as resultSequence,
    tryCatch,
    fromNullable as resultFromNullable
} from './result.ts';

// Composition utilities
export {
    pipe,
    compose,
    curry,
    curry3,
    identity,
    constant,
    tap
} from './composition.ts';

// Memoization utilities
export {
    memoize,
    memoizeWeak,
    memoizeOne,
    clearableCache,
    memoizeAsync
} from './memoization.ts';
