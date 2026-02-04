/**
 * OpenClaw Client - HTTP client for WhatsApp gateway
 *
 * Singleton client for communicating with OpenClaw service.
 * Handles authentication, timeout, graceful degradation.
 *
 * Follows RTRVR client pattern.
 */

import { logger } from '@/lib/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OPENCLAW_API_BASE = process.env.OPENCLAW_API_URL || 'http://localhost:3001';

export interface OpenClawConfig {
    apiUrl?: string;
    apiKey?: string;
    timeout?: number; // Default: 30000 (30s)
}

export interface OpenClawResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

// ============================================================================
// CLIENT CLASS
// ============================================================================

class OpenClawClient {
    private apiUrl: string;
    private apiKey: string;
    private timeout: number;

    constructor(config?: Partial<OpenClawConfig>) {
        this.apiUrl = config?.apiUrl || process.env.OPENCLAW_API_URL || '';
        this.apiKey = config?.apiKey || process.env.OPENCLAW_API_KEY || '';
        this.timeout = config?.timeout || 30000;

        if (!this.apiUrl || !this.apiKey) {
            logger.warn('[OpenClaw] Service not configured - WhatsApp features disabled');
        }
    }

    /**
     * Check if OpenClaw service is configured and available
     */
    isAvailable(): boolean {
        return !!(this.apiUrl && this.apiKey);
    }

    /**
     * Make authenticated HTTP request to OpenClaw service
     */
    async request<T = unknown>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
        body?: Record<string, unknown>
    ): Promise<OpenClawResponse<T>> {
        if (!this.isAvailable()) {
            return {
                success: false,
                error: 'OpenClaw service not configured',
            };
        }

        const url = `${this.apiUrl}${endpoint}`;

        logger.info(`[OpenClaw] ${method} ${endpoint}`, {
            hasBody: !!body,
        });

        // Abort controller for timeout management
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`[OpenClaw] ${method} ${endpoint} failed`, {
                    status: response.status,
                    error: errorText,
                });
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${errorText}`,
                };
            }

            const data = await response.json();

            logger.info(`[OpenClaw] ${method} ${endpoint} success`, {
                hasData: !!data,
            });

            return {
                success: true,
                data: data as T,
            };
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error && error.name === 'AbortError') {
                logger.error('[OpenClaw] Request timeout');
                return {
                    success: false,
                    error: 'Request timeout',
                };
            }

            logger.error('[OpenClaw] Request failed', { error });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let clientInstance: OpenClawClient | null = null;

export function getOpenClawClient(config?: Partial<OpenClawConfig>): OpenClawClient {
    if (!clientInstance || config) {
        clientInstance = new OpenClawClient(config);
    }
    return clientInstance;
}

export function isOpenClawAvailable(): boolean {
    return getOpenClawClient().isAvailable();
}

export { OpenClawClient };
