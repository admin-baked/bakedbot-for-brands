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
    return useMemo(() => {
        if (pool.length <= count) return pool;
        // Shuffle with a fresh random seed each mount
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps = run once per mount (fresh on login/refresh)
}
