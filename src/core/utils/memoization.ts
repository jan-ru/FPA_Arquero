/**
 * Memoization Utilities
 * 
 * Cache function results to avoid redundant computations.
 * Essential for performance optimization in functional code.
 */

/**
 * Memoize - Cache function results based on arguments
 * 
 * @param fn - Function to memoize
 * @param keyFn - Optional custom key generator (defaults to JSON.stringify)
 * 
 * @example
 * const expensiveCalc = memoize((x: number) => {
 *     console.log('Computing...');
 *     return x * x;
 * });
 * 
 * expensiveCalc(5); // Logs "Computing...", returns 25
 * expensiveCalc(5); // Returns 25 (cached, no log)
 */
export const memoize = <A extends any[], R>(
    fn: (...args: A) => R,
    keyFn: (...args: A) => string = (...args) => JSON.stringify(args)
): ((...args: A) => R) => {
    const cache = new Map<string, R>();
    
    return (...args: A): R => {
        const key = keyFn(...args);
        
        if (cache.has(key)) {
            return cache.get(key)!;
        }
        
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};

/**
 * MemoizeWeak - Cache using WeakMap for automatic garbage collection
 * Only works with object keys
 * 
 * @example
 * const processUser = memoizeWeak((user: User) => {
 *     return expensiveTransform(user);
 * });
 */
export const memoizeWeak = <K extends object, V>(
    fn: (key: K) => V
): ((key: K) => V) => {
    const cache = new WeakMap<K, V>();
    
    return (key: K): V => {
        if (cache.has(key)) {
            return cache.get(key)!;
        }
        
        const result = fn(key);
        cache.set(key, result);
        return result;
    };
};

/**
 * MemoizeOne - Only cache the most recent result
 * Useful when you expect sequential calls with the same arguments
 * 
 * @example
 * const format = memoizeOne((value: number) => {
 *     return value.toLocaleString('nl-NL');
 * });
 */
export const memoizeOne = <A extends any[], R>(
    fn: (...args: A) => R,
    isEqual: (a: A, b: A) => boolean = (a, b) => JSON.stringify(a) === JSON.stringify(b)
): ((...args: A) => R) => {
    let lastArgs: A | undefined;
    let lastResult: R | undefined;
    let hasResult = false;
    
    return (...args: A): R => {
        if (hasResult && lastArgs && isEqual(args, lastArgs)) {
            return lastResult!;
        }
        
        lastArgs = args;
        lastResult = fn(...args);
        hasResult = true;
        return lastResult;
    };
};

/**
 * ClearableCache - Memoization with manual cache clearing
 * 
 * @example
 * const calc = clearableCache((x: number) => x * x);
 * calc.fn(5); // 25
 * calc.fn(5); // 25 (cached)
 * calc.clear();
 * calc.fn(5); // 25 (recomputed)
 */
export const clearableCache = <A extends any[], R>(
    fn: (...args: A) => R,
    keyFn: (...args: A) => string = (...args) => JSON.stringify(args)
): {
    fn: (...args: A) => R;
    clear: () => void;
    size: () => number;
} => {
    const cache = new Map<string, R>();
    
    return {
        fn: (...args: A): R => {
            const key = keyFn(...args);
            
            if (cache.has(key)) {
                return cache.get(key)!;
            }
            
            const result = fn(...args);
            cache.set(key, result);
            return result;
        },
        clear: () => cache.clear(),
        size: () => cache.size
    };
};

/**
 * MemoizeAsync - Memoize async functions
 * 
 * @example
 * const fetchUser = memoizeAsync(async (id: string) => {
 *     const response = await fetch(`/api/users/${id}`);
 *     return response.json();
 * });
 */
export const memoizeAsync = <A extends any[], R>(
    fn: (...args: A) => Promise<R>,
    keyFn: (...args: A) => string = (...args) => JSON.stringify(args)
): ((...args: A) => Promise<R>) => {
    const cache = new Map<string, Promise<R>>();
    
    return async (...args: A): Promise<R> => {
        const key = keyFn(...args);
        
        if (cache.has(key)) {
            return cache.get(key)!;
        }
        
        const promise = fn(...args);
        cache.set(key, promise);
        
        try {
            return await promise;
        } catch (error) {
            // Remove failed promises from cache
            cache.delete(key);
            throw error;
        }
    };
};
