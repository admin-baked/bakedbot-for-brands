'use client';

import { useMemo } from 'react';

/**
 * useRotatingPrompts
 *
 * Picks a fresh random subset of prompts on every component mount
 * (i.e., on login or inbox refresh), but stays stable during the session.
 *
 * @param pool  - Full list of available prompts
 * @param count - How many to show at once (default: 4)
 */
export function useRotatingPrompts(pool: string[], count: number = 4): string[] {
    const poolSignature = pool.join('\u0000');
    const stablePool = useMemo(() => pool, [poolSignature]);

    return useMemo(() => {
        if (stablePool.length <= count) return stablePool;
        // Shuffle with a fresh random seed each mount
        const shuffled = [...stablePool].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }, [count, poolSignature, stablePool]);
}
