'use server';

import { getSecret } from '@/server/utils/secrets';

/**
 * WordPress Tracker API Integration
 * 
 * Interacts with the Cannabis AI Usage Tracker REST API via /wp-json/bbai/v1/orgs.
 * Used for submitting discovered AI adoption data.
 */

const API_BASE_URL = 'https://bakedbot.ai/wp-json/bbai/v1';

export interface TrackerOrg {
    org_name: string;
    segment: 'Dispensary' | 'Brand' | 'MSO' | 'Tech' | 'Ancillary' | 'Distributor' | 'Cultivator' | 'Manufacturer' | 'Delivery';
    vertical?: string;
    state: string; // US/CA postal code (e.g. IL)
    location?: string;
    website: string;
    chain_size?: number;
    ai_tools: string[];
    use_case: string[];
    maturity: 'Emerging' | 'Validating' | 'Deploying' | 'Scaling' | 'Established';
    adoption_score?: number;
    delta_30d?: number;
    conversion_lift?: number;
    cart_size_lift?: number;
    cost_reduction?: number;
    compliance_reduction?: number;
    equity_owned?: boolean;
    privacy_url?: string;
    csat?: number;
    sentiment_score?: number;
    headless_detected?: boolean;
    signals?: string;
    first_seen?: string; // YYYY-MM-DD
    last_verified?: string; // YYYY-MM-DD
    evidence_url?: string;
    verified?: boolean;
    contact?: string;
    notes?: string;
}

export interface TrackerResult {
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * Get the bearer token for API authentication
 */
async function getApiToken(): Promise<string | null> {
    try {
        // First try to get from secrets
        const token = await getSecret('WORDPRESS_API_TOKEN');
        if (token) return token;
        
        // Fallback or explicit error if missing
        console.warn('[WordPress] WORDPRESS_API_TOKEN secret not found');
        return null;
    } catch (e) {
        console.error('[WordPress] Failed to get API token', e);
        return null;
    }
}

/**
 * Submit organization data to the tracker
 */
export async function submitToTracker(orgs: TrackerOrg[] | TrackerOrg): Promise<TrackerResult> {
    const token = await getApiToken();
    
    // For now, if no token, we can mock success or fail. 
    // Given the user provided a token in the prompt, let's allow passing it or fail if missing.
    if (!token) {
        return { success: false, error: 'Missing WORDPRESS_API_TOKEN configuration' };
    }

    const payload = Array.isArray(orgs) ? orgs : [orgs];

    try {
        console.log(`[WordPress] Submitting ${payload.length} orgs to tracker`);
        
        const response = await fetch(`${API_BASE_URL}/orgs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
            return {
                success: false,
                error: `API Error ${response.status}: ${responseData.message || response.statusText}`
            };
        }

        return {
            success: true,
            data: responseData
        };

    } catch (error: any) {
        console.error('[WordPress] Submit error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get tracker statistics
 */
export async function getTrackerStats(): Promise<TrackerResult> {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, error: `API Error ${response.status}` };
        }

        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
