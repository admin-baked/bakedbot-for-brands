/**
 * Vibe Usage Tracker
 *
 * Client-side tracking for the public vibe generator.
 * Uses localStorage to track:
 * - Number of vibes generated (max 3 free)
 * - Whether email has been captured
 * - Session data for lead scoring
 */

const STORAGE_KEY = 'bakedbot_vibe_usage';
const MAX_FREE_VIBES = 3;

export interface VibeUsageData {
    // Usage tracking
    vibeCount: number;
    webVibeCount: number;
    mobileVibeCount: number;
    refinementCount: number;

    // Email capture
    emailCaptured: boolean;
    capturedEmail?: string;
    leadId?: string;

    // Session info
    sessionId: string;
    firstVisit: string;
    lastVisit: string;

    // Generated vibes (for preview)
    generatedVibes: Array<{
        id: string;
        name: string;
        type: 'web' | 'mobile';
        createdAt: string;
    }>;

    // UTM tracking
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
}

function generateSessionId(): string {
    return `vs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getDefaultUsageData(): VibeUsageData {
    return {
        vibeCount: 0,
        webVibeCount: 0,
        mobileVibeCount: 0,
        refinementCount: 0,
        emailCaptured: false,
        sessionId: generateSessionId(),
        firstVisit: new Date().toISOString(),
        lastVisit: new Date().toISOString(),
        generatedVibes: [],
    };
}

/**
 * Get current usage data from localStorage
 */
export function getVibeUsage(): VibeUsageData {
    if (typeof window === 'undefined') {
        return getDefaultUsageData();
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            const defaultData = getDefaultUsageData();
            // Capture UTM params on first visit
            const params = new URLSearchParams(window.location.search);
            defaultData.utmSource = params.get('utm_source') || undefined;
            defaultData.utmMedium = params.get('utm_medium') || undefined;
            defaultData.utmCampaign = params.get('utm_campaign') || undefined;
            saveVibeUsage(defaultData);
            return defaultData;
        }
        const data = JSON.parse(stored) as VibeUsageData;
        // Update last visit
        data.lastVisit = new Date().toISOString();
        return data;
    } catch {
        return getDefaultUsageData();
    }
}

/**
 * Save usage data to localStorage
 */
export function saveVibeUsage(data: VibeUsageData): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // localStorage might be full or disabled
    }
}

/**
 * Check if user can generate more vibes
 */
export function canGenerateVibe(type: 'web' | 'mobile' = 'web'): {
    allowed: boolean;
    reason?: 'limit_reached' | 'mobile_requires_email';
    remaining: number;
} {
    const usage = getVibeUsage();

    // If email captured, they get 3 more vibes
    const maxVibes = usage.emailCaptured ? MAX_FREE_VIBES * 2 : MAX_FREE_VIBES;
    const remaining = Math.max(0, maxVibes - usage.vibeCount);

    // Mobile always requires email
    if (type === 'mobile' && !usage.emailCaptured) {
        return {
            allowed: false,
            reason: 'mobile_requires_email',
            remaining,
        };
    }

    // Check limit
    if (usage.vibeCount >= maxVibes) {
        return {
            allowed: false,
            reason: 'limit_reached',
            remaining: 0,
        };
    }

    return {
        allowed: true,
        remaining,
    };
}

/**
 * Record a vibe generation
 */
export function recordVibeGeneration(vibe: {
    id: string;
    name: string;
    type: 'web' | 'mobile';
}): VibeUsageData {
    const usage = getVibeUsage();

    usage.vibeCount += 1;
    if (vibe.type === 'web') {
        usage.webVibeCount += 1;
    } else {
        usage.mobileVibeCount += 1;
    }

    usage.generatedVibes.push({
        ...vibe,
        createdAt: new Date().toISOString(),
    });

    // Keep only last 10 vibes in storage
    if (usage.generatedVibes.length > 10) {
        usage.generatedVibes = usage.generatedVibes.slice(-10);
    }

    usage.lastVisit = new Date().toISOString();
    saveVibeUsage(usage);

    return usage;
}

/**
 * Record a vibe refinement
 */
export function recordRefinement(): VibeUsageData {
    const usage = getVibeUsage();
    usage.refinementCount += 1;
    usage.lastVisit = new Date().toISOString();
    saveVibeUsage(usage);
    return usage;
}

/**
 * Record email capture - grants additional vibes
 */
export function recordEmailCapture(email: string, leadId: string): VibeUsageData {
    const usage = getVibeUsage();
    usage.emailCaptured = true;
    usage.capturedEmail = email;
    usage.leadId = leadId;
    usage.lastVisit = new Date().toISOString();
    saveVibeUsage(usage);
    return usage;
}

/**
 * Check if email has been captured
 */
export function hasEmailCaptured(): boolean {
    const usage = getVibeUsage();
    return usage.emailCaptured;
}

/**
 * Get captured email if exists
 */
export function getCapturedEmail(): string | undefined {
    const usage = getVibeUsage();
    return usage.capturedEmail;
}

/**
 * Get UTM parameters
 */
export function getUtmParams(): {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
} {
    const usage = getVibeUsage();
    return {
        utmSource: usage.utmSource,
        utmMedium: usage.utmMedium,
        utmCampaign: usage.utmCampaign,
    };
}

/**
 * Get usage stats for display
 */
export function getUsageStats(): {
    vibesGenerated: number;
    vibesRemaining: number;
    maxVibes: number;
    emailCaptured: boolean;
    showUpgradePrompt: boolean;
} {
    const usage = getVibeUsage();
    const maxVibes = usage.emailCaptured ? MAX_FREE_VIBES * 2 : MAX_FREE_VIBES;
    const remaining = Math.max(0, maxVibes - usage.vibeCount);

    return {
        vibesGenerated: usage.vibeCount,
        vibesRemaining: remaining,
        maxVibes,
        emailCaptured: usage.emailCaptured,
        showUpgradePrompt: remaining === 0,
    };
}

/**
 * Reset usage (for testing)
 */
export function resetVibeUsage(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

// ============================================
// ALIASES for convenience
// ============================================

/**
 * Alias for getVibeUsage
 */
export const getUsageData = getVibeUsage;

/**
 * Get remaining vibe count
 */
export function getRemainingVibes(): number {
    const usage = getVibeUsage();
    const maxVibes = usage.emailCaptured ? MAX_FREE_VIBES * 2 : MAX_FREE_VIBES;
    return Math.max(0, maxVibes - usage.vibeCount);
}

/**
 * Check if user has provided email
 */
export function hasProvidedEmail(): boolean {
    return hasEmailCaptured();
}
