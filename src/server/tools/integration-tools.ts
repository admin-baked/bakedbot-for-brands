/**
 * Integration Tools
 *
 * Agent tools for checking and requesting third-party service integrations.
 * Supports OAuth (Google), API keys (POS systems), and other auth methods.
 */

import { z } from 'zod';
import { ClaudeTool } from '@/ai/claude';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type {
    IntegrationProvider,
    IntegrationStatus,
    IntegrationStatusCheck,
    IntegrationStatusMap,
    IntegrationRequest,
    IntegrationAuthMethod,
    IntegrationCategory,
} from '@/types/service-integrations';
import { INTEGRATION_METADATA } from '@/types/service-integrations';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

export const integrationTools: ClaudeTool[] = [
    {
        name: 'check_integration_status',
        description:
            'Check which integrations are connected or disconnected for the user. Use this before attempting to use integration-dependent tools (like send_gmail, sync_inventory, etc.) to provide a better user experience.',
        input_schema: {
            type: 'object' as const,
            properties: {
                provider: {
                    type: 'string',
                    description:
                        'Specific provider to check (e.g., "gmail", "dutchie", "alleaves"). Omit to check all integrations.',
                },
            },
            required: [],
        },
    },
    {
        name: 'request_integration',
        description:
            'Request the user to connect a third-party integration by creating an inline connection card in the chat. Use this when you need an integration that is not yet connected. The card will guide the user through OAuth or API key setup.',
        input_schema: {
            type: 'object' as const,
            properties: {
                provider: {
                    type: 'string',
                    description:
                        'Integration provider to request (e.g., "gmail", "google_calendar", "dutchie", "alleaves", "mailchimp")',
                },
                reason: {
                    type: 'string',
                    description:
                        'Clear explanation of why this integration is needed for the current task (e.g., "To send this email as you", "To sync your inventory", "To schedule this campaign")',
                },
                enablesAction: {
                    type: 'string',
                    description:
                        'Optional: specific action this will enable (e.g., "send_gmail", "sync_inventory", "create_campaign")',
                },
                threadId: {
                    type: 'string',
                    description: 'Current thread ID to return to after OAuth flow',
                },
            },
            required: ['provider', 'reason'],
        },
    },
];

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

/**
 * Check integration status for user
 */
export async function checkIntegrationStatus(
    userId: string,
    provider?: IntegrationProvider
): Promise<IntegrationStatusCheck | IntegrationStatusMap> {
    try {
        const db = getAdminFirestore();

        // Check specific provider
        if (provider) {
            const docRef = db.collection('users').doc(userId).collection('integrations').doc(provider);
            const doc = await docRef.get();

            if (!doc.exists) {
                return {
                    provider,
                    connected: false,
                    status: 'disconnected' as IntegrationStatus,
                };
            }

            const data = doc.data();
            const isExpired = data?.expiresAt && new Date(data.expiresAt) < new Date();

            return {
                provider,
                connected: !isExpired,
                status: isExpired ? ('expired' as IntegrationStatus) : (data?.status as IntegrationStatus) || 'connected',
                connectedAt: data?.connectedAt,
                lastError: data?.lastError,
            };
        }

        // Check all integrations
        const snapshot = await db.collection('users').doc(userId).collection('integrations').get();

        const statusMap: IntegrationStatusMap = {};

        snapshot.forEach((doc) => {
            const data = doc.data();
            const isExpired = data?.expiresAt && new Date(data.expiresAt) < new Date();

            statusMap[doc.id as IntegrationProvider] = {
                provider: doc.id as IntegrationProvider,
                connected: !isExpired,
                status: isExpired ? 'expired' : data?.status || 'connected',
                connectedAt: data?.connectedAt,
                lastError: data?.lastError,
            };
        });

        return statusMap;
    } catch (error) {
        logger.error('[INTEGRATION_TOOLS] Error checking integration status', {
            userId,
            provider,
            error,
        });
        throw error;
    }
}

/**
 * Request integration by creating an inbox artifact
 */
export async function requestIntegration(params: {
    userId: string;
    orgId: string;
    threadId: string;
    provider: IntegrationProvider;
    reason: string;
    enablesAction?: string;
}): Promise<{ success: boolean; artifactId?: string; error?: string }> {
    try {
        const db = getAdminFirestore();
        const { userId, orgId, threadId, provider, reason, enablesAction } = params;

        // Get metadata for the provider
        const metadata = INTEGRATION_METADATA[provider];
        if (!metadata) {
            return {
                success: false,
                error: `Unknown integration provider: ${provider}`,
            };
        }

        // Create integration request artifact
        const integrationRequest: IntegrationRequest = {
            provider,
            reason,
            authMethod: metadata.authMethod as IntegrationAuthMethod,
            category: metadata.category as IntegrationCategory,
            setupTime: metadata.setupTime,
            threadId,
            enablesAction,
        };

        // Save artifact to Firestore
        const artifactRef = db.collection('inbox_artifacts').doc();
        await artifactRef.set({
            id: artifactRef.id,
            threadId,
            orgId,
            type: 'integration_request',
            status: 'draft',
            data: integrationRequest,
            rationale: reason,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: userId,
        });

        // Update thread with artifact ID
        const threadRef = db.collection('inbox_threads').doc(threadId);
        await threadRef.update({
            artifactIds: getAdminFirestore.FieldValue.arrayUnion(artifactRef.id),
            updatedAt: new Date().toISOString(),
        });

        logger.info('[INTEGRATION_TOOLS] Created integration request artifact', {
            artifactId: artifactRef.id,
            provider,
            threadId,
        });

        return {
            success: true,
            artifactId: artifactRef.id,
        };
    } catch (error: any) {
        logger.error('[INTEGRATION_TOOLS] Error requesting integration', {
            ...params,
            error,
        });
        return {
            success: false,
            error: error.message || 'Failed to create integration request',
        };
    }
}

// ============================================================================
// TOOL EXECUTOR (for agent harness)
// ============================================================================

/**
 * Execute integration tool
 */
export async function executeIntegrationTool(
    toolName: string,
    toolInput: any,
    context: { userId: string; orgId: string; threadId?: string }
): Promise<any> {
    const { userId, orgId, threadId } = context;

    switch (toolName) {
        case 'check_integration_status': {
            const { provider } = toolInput;
            const result = await checkIntegrationStatus(userId, provider);

            if (provider) {
                const check = result as IntegrationStatusCheck;
                return {
                    provider: check.provider,
                    connected: check.connected,
                    status: check.status,
                    message: check.connected
                        ? `${provider} is connected${check.connectedAt ? ` since ${check.connectedAt}` : ''}`
                        : `${provider} is not connected`,
                };
            } else {
                const statusMap = result as IntegrationStatusMap;
                const connected = Object.entries(statusMap).filter(([_, check]) => check.connected);
                const disconnected = Object.entries(statusMap).filter(([_, check]) => !check.connected);

                return {
                    summary: {
                        total: Object.keys(statusMap).length,
                        connected: connected.length,
                        disconnected: disconnected.length,
                    },
                    connected: connected.map(([provider, check]) => ({
                        provider,
                        status: check.status,
                        connectedAt: check.connectedAt,
                    })),
                    disconnected: disconnected.map(([provider, check]) => ({
                        provider,
                        status: check.status,
                    })),
                };
            }
        }

        case 'request_integration': {
            if (!threadId) {
                throw new Error('threadId is required for request_integration');
            }

            const { provider, reason, enablesAction } = toolInput;

            // First check if already connected
            const status = await checkIntegrationStatus(userId, provider);
            if ('connected' in status && status.connected) {
                return {
                    success: false,
                    message: `${provider} is already connected`,
                    alreadyConnected: true,
                };
            }

            const result = await requestIntegration({
                userId,
                orgId,
                threadId,
                provider,
                reason,
                enablesAction,
            });

            if (result.success) {
                const metadata = INTEGRATION_METADATA[provider as IntegrationProvider];
                return {
                    success: true,
                    message: `Created connection request for ${metadata.name}. User will see an inline card to connect.`,
                    artifactId: result.artifactId,
                    authMethod: metadata.authMethod,
                    setupTime: metadata.setupTime,
                };
            } else {
                return {
                    success: false,
                    message: result.error || 'Failed to create integration request',
                };
            }
        }

        default:
            throw new Error(`Unknown integration tool: ${toolName}`);
    }
}
