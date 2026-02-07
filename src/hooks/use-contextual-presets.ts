'use client';

/**
 * Contextual Presets Hook
 *
 * Provides contextual preset suggestions based on time of day,
 * recent activity, and seasonal events.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useInboxStore } from '@/lib/store/inbox-store';
import {
    generateContextualPresets,
    getRotatingPresets,
} from '@/lib/services/contextual-presets';
import type { InboxQuickAction } from '@/types/inbox';

interface UseContextualPresetsOptions {
    role: string | null;
    orgId?: string | null;
}

interface UseContextualPresetsReturn {
    presets: InboxQuickAction[];
    greeting: string;
    suggestion: string;
    refresh: () => void;
    getMorePresets: (exclude: string[]) => InboxQuickAction[];
    isLoading: boolean;
}

export function useContextualPresets({
    role,
    orgId,
}: UseContextualPresetsOptions): UseContextualPresetsReturn {
    const threads = useInboxStore((state) => state.threads);
    const [rotationKey, setRotationKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Mark as loaded after initial render
    useEffect(() => {
        setIsLoading(false);
    }, []);

    const result = useMemo(() => {
        if (!role) {
            return {
                presets: [],
                greeting: 'Welcome',
                suggestion: 'What would you like to work on?',
            };
        }

        return generateContextualPresets({
            role,
            recentThreads: threads.slice(0, 10),
            currentDate: new Date(),
            orgId: orgId || undefined,
        });
        // Include rotationKey to force recalculation on refresh
    }, [role, threads, orgId, rotationKey]);

    const refresh = useCallback(() => {
        // Increment key to trigger re-render with new random selection
        setRotationKey((k) => k + 1);
    }, []);

    const getMorePresets = useCallback(
        (exclude: string[]) => {
            if (!role) return [];
            return getRotatingPresets({ role }, exclude);
        },
        [role]
    );

    return {
        ...result,
        refresh,
        getMorePresets,
        isLoading,
    };
}
