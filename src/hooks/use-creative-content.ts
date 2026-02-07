'use client';

/**
 * useCreativeContent Hook
 *
 * Manages creative content state for the Creative Command Center.
 * Provides real-time updates via Firestore listeners and handles
 * content generation, approval, and revision workflows.
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useOptionalFirebase } from '@/firebase/use-optional-firebase';
import { useBrandId } from './use-brand-id';
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    limit,
    Unsubscribe
} from 'firebase/firestore';
import type {
    CreativeContent,
    SocialPlatform,
    GenerateContentRequest
} from '@/types/creative-content';
import {
    getPendingContent,
    approveContent,
    requestRevision,
    generateContent,
    deleteContent,
    updateCaption
} from '@/server/actions/creative-content';
import { logger } from '@/lib/logger';

interface UseCreativeContentOptions {
    platform?: SocialPlatform;
    statusFilter?: ('pending' | 'draft' | 'approved' | 'scheduled')[];
    limit?: number;
    realtime?: boolean;
}

interface UseCreativeContentReturn {
    content: CreativeContent[];
    loading: boolean;
    error: string | null;
    // Actions
    generate: (request: Omit<GenerateContentRequest, 'tenantId' | 'brandId'>) => Promise<CreativeContent | null>;
    approve: (contentId: string, scheduledAt?: string) => Promise<void>;
    revise: (contentId: string, note: string) => Promise<void>;
    editCaption: (contentId: string, newCaption: string) => Promise<void>;
    remove: (contentId: string) => Promise<void>;
    refresh: () => void;
    // State
    isGenerating: boolean;
    isApproving: string | null;
}

export function useCreativeContent(
    options: UseCreativeContentOptions = {}
): UseCreativeContentReturn {
    const { platform, statusFilter = ['pending', 'draft'], realtime = true } = options;

    const { user, isUserLoading } = useUser();
    const firebase = useOptionalFirebase();
    const { brandId } = useBrandId();

    const [content, setContent] = useState<CreativeContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isApproving, setIsApproving] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Get tenant ID from user claims (supports brand and dispensary roles)
    const tenantId = (user as any)?.tenantId || (user as any)?.brandId || (user as any)?.locationId || brandId;

    // Fetch content (with optional real-time updates)
    useEffect(() => {
        if (isUserLoading) return;
        if (!user || !tenantId) {
            setContent([]);
            setLoading(false);
            return;
        }

        let unsubscribe: Unsubscribe | undefined;

        const fetchContent = async () => {
            setLoading(true);
            setError(null);

            try {
                if (realtime && firebase?.firestore) {
                    // Real-time listener with enhanced error handling
                    let q = query(
                        collection(firebase.firestore, `tenants/${tenantId}/creative_content`),
                        where('status', 'in', statusFilter),
                        orderBy('createdAt', 'desc'),
                        limit(options.limit || 50)
                    );

                    if (platform) {
                        q = query(
                            collection(firebase.firestore, `tenants/${tenantId}/creative_content`),
                            where('platform', '==', platform),
                            where('status', 'in', statusFilter),
                            orderBy('createdAt', 'desc'),
                            limit(options.limit || 50)
                        );
                    }

                    try {
                        unsubscribe = onSnapshot(
                            q,
                            (snapshot) => {
                                try {
                                    const items = snapshot.docs.map(doc => ({
                                        id: doc.id,
                                        ...doc.data()
                                    } as CreativeContent));
                                    setContent(items);
                                    setLoading(false);
                                } catch (mapError) {
                                    // Handle errors during data mapping
                                    logger.error('[useCreativeContent] Error mapping snapshot', { error: String(mapError) });
                                    fetchViaServerAction();
                                }
                            },
                            (err) => {
                                // Fall back to server action on any Firestore errors
                                // This includes permission errors and SDK assertion failures
                                logger.warn('[useCreativeContent] Firestore listener error, falling back to server action', { error: err.message });
                                fetchViaServerAction();
                            }
                        );
                    } catch (listenerError) {
                        // Catch synchronous errors from onSnapshot setup
                        // This can happen with Firestore SDK assertion failures
                        logger.error('[useCreativeContent] Failed to setup Firestore listener', { error: String(listenerError) });
                        await fetchViaServerAction();
                    }
                } else {
                    // Fallback to server action
                    await fetchViaServerAction();
                }
            } catch (err: unknown) {
                // Final fallback - try server action if anything fails
                logger.error('[useCreativeContent] Error in fetchContent', { error: String(err) });
                try {
                    await fetchViaServerAction();
                } catch (serverErr) {
                    setError(serverErr instanceof Error ? serverErr.message : 'Failed to fetch content');
                    setLoading(false);
                }
            }
        };

        const fetchViaServerAction = async () => {
            try {
                const response = await getPendingContent(tenantId, { limit: options.limit || 50 });
                let filtered = response.content;

                if (platform) {
                    filtered = response.content.filter((item: CreativeContent) => item.platform === platform);
                }

                setContent(filtered);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to fetch content');
            } finally {
                setLoading(false);
            }
        };

        fetchContent();

        return () => {
            if (unsubscribe) {
                try {
                    unsubscribe();
                } catch (cleanupError) {
                    // Silently ignore cleanup errors - these can occur if the
                    // Firestore SDK is in an invalid state (e.g., due to network issues)
                    logger.warn('[useCreativeContent] Error during listener cleanup', { error: String(cleanupError) });
                }
            }
        };
    }, [user, isUserLoading, tenantId, platform, realtime, firebase, refreshKey, options.limit, JSON.stringify(statusFilter)]);

    // Generate new content
    const generate = useCallback(async (
        request: Omit<GenerateContentRequest, 'tenantId' | 'brandId'>
    ): Promise<CreativeContent | null> => {
        if (!tenantId || !brandId) {
            setError('Missing tenant or brand ID');
            return null;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const response = await generateContent({
                ...request,
                tenantId,
                brandId
            });

            // If not using realtime, manually add to state
            if (!realtime) {
                setContent(prev => [response.content, ...prev]);
            }

            return response.content;
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to generate content');
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, [tenantId, brandId, realtime]);

    // Approve content
    const approve = useCallback(async (contentId: string, scheduledAt?: string): Promise<void> => {
        if (!tenantId || !user?.uid) {
            setError('Missing tenant ID or user');
            return;
        }

        setIsApproving(contentId);
        setError(null);

        try {
            await approveContent({
                contentId,
                tenantId,
                approverId: user.uid,
                scheduledAt
            });

            // If not using realtime, manually update state
            if (!realtime) {
                setContent(prev => prev.filter(item => item.id !== contentId));
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to approve content');
        } finally {
            setIsApproving(null);
        }
    }, [tenantId, user, realtime]);

    // Request revision
    const revise = useCallback(async (contentId: string, note: string): Promise<void> => {
        if (!tenantId || !user?.uid) {
            setError('Missing tenant ID or user');
            return;
        }

        setError(null);

        try {
            await requestRevision({
                contentId,
                tenantId,
                requesterId: user.uid,
                note
            });

            // If not using realtime, manually update state
            if (!realtime) {
                setContent(prev => prev.filter(item => item.id !== contentId));
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to request revision');
        }
    }, [tenantId, user, realtime]);

    // Edit caption directly
    const editCaption = useCallback(async (contentId: string, newCaption: string): Promise<void> => {
        if (!tenantId) {
            setError('Missing tenant ID');
            return;
        }

        setError(null);

        try {
            await updateCaption(tenantId, contentId, newCaption);

            // If not using realtime, manually update state
            if (!realtime) {
                setContent(prev => prev.map(item =>
                    item.id === contentId ? { ...item, caption: newCaption } : item
                ));
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update caption');
        }
    }, [tenantId, realtime]);

    // Delete content
    const remove = useCallback(async (contentId: string): Promise<void> => {
        if (!tenantId) {
            setError('Missing tenant ID');
            return;
        }

        setError(null);

        try {
            await deleteContent(tenantId, contentId);

            // If not using realtime, manually update state
            if (!realtime) {
                setContent(prev => prev.filter(item => item.id !== contentId));
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to delete content');
        }
    }, [tenantId, realtime]);

    // Manual refresh
    const refresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    return {
        content,
        loading,
        error,
        generate,
        approve,
        revise,
        editCaption,
        remove,
        refresh,
        isGenerating,
        isApproving
    };
}
