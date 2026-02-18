'use client';

import { useState, useEffect, useMemo } from 'react';
import { getDynamicPromptSuggestions } from '@/server/actions/dynamic-prompts';

/**
 * useDynamicPrompts
 *
 * Fetches live contextual prompts (CRM signals, competitive intel alerts,
 * market trends from the latest Drive report) and merges them with the
 * static pool.  Returns a freshly-shuffled set of `count` chips on
 * every mount (login / inbox refresh).
 *
 * Strategy:
 *   - Show `dynamicSlots` dynamic prompts (data-driven, personalised)
 *   - Fill remaining slots with shuffled static prompts
 *   - While loading: show a full shuffle of the static pool
 *   - On error: fall back silently to the static pool
 *
 * @param orgId        - The org whose data to read
 * @param staticPool   - Full static prompt pool for this role
 * @param count        - Total chips to show (default 4)
 * @param dynamicSlots - Max dynamic chips to include (default 2)
 */
export function useDynamicPrompts(
    orgId: string | null | undefined,
    staticPool: string[],
    count: number = 4,
    dynamicSlots: number = 2
): { prompts: string[]; isLoading: boolean } {
    const [dynamicPrompts, setDynamicPrompts] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Stable shuffle of the static pool — re-runs once per mount
    const shuffledStatic = useMemo(() => {
        return [...staticPool].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // empty deps = fresh shuffle each mount (login/refresh)

    useEffect(() => {
        if (!orgId) {
            setIsLoading(false);
            return;
        }

        getDynamicPromptSuggestions(orgId)
            .then(results => setDynamicPrompts(results.slice(0, dynamicSlots)))
            .catch(() => setDynamicPrompts([]))
            .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]); // re-fetch only if org changes

    const prompts = useMemo(() => {
        // During load, show a static shuffle so there's no empty state
        if (isLoading) return shuffledStatic.slice(0, count);

        // Merge: dynamic first, fill remaining slots from static
        // Deduplicate in case a dynamic prompt overlaps a static one
        const combined: string[] = [];
        for (const p of dynamicPrompts) {
            if (!combined.includes(p)) combined.push(p);
        }
        for (const p of shuffledStatic) {
            if (combined.length >= count) break;
            if (!combined.includes(p)) combined.push(p);
        }
        return combined.slice(0, count);
    }, [isLoading, dynamicPrompts, shuffledStatic, count]);

    return { prompts, isLoading };
}
