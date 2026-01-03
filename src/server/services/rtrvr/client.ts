/**
 * RTRVR Client - Core API Client
 * 
 * Core HTTP client for RTRVR.ai browser automation APIs.
 * Handles authentication, rate limiting, and error handling.
 * 
 * @see https://www.rtrvr.ai/docs/api
 */

import { logger } from '@/lib/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const RTRVR_API_BASE = 'https://api.rtrvr.ai';
const RTRVR_MCP_BASE = 'https://www.rtrvr.ai/mcp';

export interface RTRVRConfig {
    apiKey: string;
    timeout?: number; // Default: 120000 (2 min for browser automation)
    maxRetries?: number;
}

// ============================================================================
// TYPES
// ============================================================================

export interface RTRVRResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    credits?: {
        used: number;
        remaining: number;
    };
    usage?: {
        inputTokens?: number;
        outputTokens?: number;
        durationMs?: number;
    };
}

export interface RTRVRError {
    code: string;
    message: string;
    statusCode?: number;
}

// ============================================================================
// CLIENT CLASS
// ============================================================================

class RTRVRClient {
    private apiKey: string;
    private timeout: number;
    private maxRetries: number;

    constructor(config?: Partial<RTRVRConfig>) {
        this.apiKey = config?.apiKey || process.env.RTRVR_API_KEY || '';
        this.timeout = config?.timeout || 120000; // 2 minutes for browser tasks
        this.maxRetries = config?.maxRetries || 2;

        if (!this.apiKey) {
            logger.warn('[RTRVR] No API key configured - RTRVR features will be disabled');
        }
    }

    /**
     * Check if RTRVR is configured and available
     */
    isAvailable(): boolean {
        return !!this.apiKey;
    }

    /**
     * Make authenticated request to RTRVR API
     */
    async request<T = unknown>(
        endpoint: string,
        body: Record<string, unknown>,
        options: { base?: string; timeout?: number } = {}
    ): Promise<RTRVRResponse<T>> {
        if (!this.isAvailable()) {
            return {
                success: false,
                error: 'RTRVR API key not configured',
            };
        }

        const base = options.base || RTRVR_API_BASE;
        const url = `${base}${endpoint}`;
        const timeout = options.timeout || this.timeout;

        logger.info(`[RTRVR] POST ${endpoint}`, { 
            hasInput: !!body.input,
            hasUrls: !!(body.urls as unknown[])?.length 
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`[RTRVR] Error ${response.status}`, { error: errorText });
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${errorText}`,
                };
            }

            const data = await response.json();
            
            logger.info(`[RTRVR] Response received`, { 
                status: data.status,
                hasResult: !!data.result 
            });

            return {
                success: true,
                data: data as T,
                credits: data.credits,
                usage: data.usage,
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
                logger.error('[RTRVR] Request timeout');
                return {
                    success: false,
                    error: 'Request timeout - browser automation took too long',
                };
            }

            logger.error('[RTRVR] Request failed', { error });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * POST to /agent endpoint (autonomous browser automation)
     */
    async agent<T = unknown>(body: Record<string, unknown>): Promise<RTRVRResponse<T>> {
        return this.request<T>('/agent', body);
    }

    /**
     * POST to /scrape endpoint (accessibility tree extraction)
     */
    async scrape<T = unknown>(body: Record<string, unknown>): Promise<RTRVRResponse<T>> {
        return this.request<T>('/scrape', body);
    }

    /**
     * POST to /mcp endpoint (logged-in browser control)
     */
    async mcp<T = unknown>(body: Record<string, unknown>): Promise<RTRVRResponse<T>> {
        return this.request<T>('', body, { base: RTRVR_MCP_BASE });
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let clientInstance: RTRVRClient | null = null;

export function getRTRVRClient(config?: Partial<RTRVRConfig>): RTRVRClient {
    if (!clientInstance || config) {
        clientInstance = new RTRVRClient(config);
    }
    return clientInstance;
}

export function isRTRVRAvailable(): boolean {
    return getRTRVRClient().isAvailable();
}

export { RTRVRClient };
