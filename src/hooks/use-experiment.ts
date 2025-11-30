/**
 * Client-side A/B Testing Hook
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

import { logger } from '@/lib/logger';
interface ExperimentConfig {
    experimentId: string;
    defaultVariant?: string;
}

export function useExperiment(config: ExperimentConfig) {
    const { user } = useAuth();
    const [variant, setVariant] = useState<string | null>(config.defaultVariant || null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function assignVariant() {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                const token = await user.getIdToken();
                const response = await fetch(`/api/experiments/${config.experimentId}/assign`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ userId: user.uid }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setVariant(data.variantId);
                }
            } catch (error) {
                logger.error('Error assigning experiment variant:', error instanceof Error ? error : new Error(String(error)));
            } finally {
                setIsLoading(false);
            }
        }

        assignVariant();
    }, [user, config.experimentId]);

    const trackMetric = async (metricName: string, value: number) => {
        if (!user || !variant) return;

        try {
            const token = await user.getIdToken();
            await fetch(`/api/experiments/${config.experimentId}/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    variantId: variant,
                    userId: user.uid,
                    metricName,
                    value,
                }),
            });
        } catch (error) {
            logger.error('Error tracking experiment metric:', error instanceof Error ? error : new Error(String(error)));
        }
    };

    return {
        variant,
        isLoading,
        trackMetric,
    };
}
