/**
 * Contextual Preset Generator
 *
 * Generates smart, rotating preset suggestions based on:
 * - Time of day
 * - Day of week
 * - User activity history
 * - Seasonal events
 */

import type { InboxQuickAction, InboxThread } from '@/types/inbox';
import { getQuickActionsForRole } from '@/types/inbox';

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
type DayType = 'weekday' | 'weekend' | 'monday' | 'friday';

interface ContextualPresetOptions {
    role: string;
    recentThreads?: InboxThread[];
    currentDate?: Date;
    orgId?: string;
}

interface ContextualPresetResult {
    presets: InboxQuickAction[];
    greeting: string;
    suggestion: string;
}

function isSuperRole(role: string): boolean {
    return role === 'super_user' || role === 'super_admin' || role === 'owner';
}

/**
 * Determine time of day bucket
 */
function getTimeOfDay(date: Date = new Date()): TimeOfDay {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

/**
 * Determine day type
 */
function getDayType(date: Date = new Date()): DayType {
    const day = date.getDay();
    if (day === 0 || day === 6) return 'weekend';
    if (day === 1) return 'monday';
    if (day === 5) return 'friday';
    return 'weekday';
}

/**
 * Check for seasonal events
 */
function getSeasonalContext(date: Date = new Date()): string | null {
    const month = date.getMonth();
    const dayOfMonth = date.getDate();

    // 4/20 - Cannabis holiday
    if (month === 3 && dayOfMonth >= 15 && dayOfMonth <= 20) {
        return '420';
    }

    // Holiday season (Dec)
    if (month === 11) {
        return 'holiday';
    }

    // Black Friday week (late November)
    if (month === 10 && dayOfMonth >= 20) {
        return 'blackfriday';
    }

    // Valentine's Day
    if (month === 1 && dayOfMonth >= 10 && dayOfMonth <= 14) {
        return 'valentines';
    }

    // Summer (June-August)
    if (month >= 5 && month <= 7) {
        return 'summer';
    }

    return null;
}

/**
 * Get time-based greeting
 */
function getGreeting(timeOfDay: TimeOfDay): string {
    switch (timeOfDay) {
        case 'morning':
            return 'Good morning';
        case 'afternoon':
            return 'Good afternoon';
        case 'evening':
            return 'Good evening';
        case 'night':
            return 'Working late?';
    }
}

/**
 * Priority presets by context
 */
const CONTEXTUAL_PRIORITIES: Record<
    string,
    {
        presetIds: string[];
        suggestion: string;
    }
> = {
    // Time + Day combinations
    'morning:monday': {
        presetIds: ['review-performance', 'new-carousel', 'customer-blast'],
        suggestion: 'Start the week strong! Review last week or create fresh content.',
    },
    'morning:weekday': {
        presetIds: ['review-performance', 'new-carousel', 'customer-blast'],
        suggestion: 'Ready to review performance or create content?',
    },
    'afternoon:weekday': {
        presetIds: ['new-creative', 'new-carousel', 'new-bundle'],
        suggestion: 'Perfect time to create marketing content!',
    },
    'afternoon:friday': {
        presetIds: ['plan-event', 'new-campaign', 'customer-blast'],
        suggestion: 'Plan next week\'s campaigns before the weekend.',
    },
    'evening:weekday': {
        presetIds: ['review-performance', 'new-bundle', 'deep-research'],
        suggestion: 'Review the day or plan ahead.',
    },
    'night:weekday': {
        presetIds: ['deep-research', 'new-creative', 'plan-event'],
        suggestion: 'Late-night creativity or research time.',
    },
    'morning:weekend': {
        presetIds: ['new-creative', 'new-carousel', 'plan-event'],
        suggestion: 'Weekend mode! Create content while it\'s quiet.',
    },
    'afternoon:weekend': {
        presetIds: ['new-bundle', 'new-creative', 'review-performance'],
        suggestion: 'Prep for the week ahead.',
    },

    // Seasonal priorities (override time-based)
    'seasonal:420': {
        presetIds: ['new-campaign', 'new-bundle', 'customer-blast'],
        suggestion: '4/20 is coming! Time to prep your biggest promotions.',
    },
    'seasonal:holiday': {
        presetIds: ['new-campaign', 'new-bundle', 'plan-event'],
        suggestion: 'Holiday season! Create festive promotions.',
    },
    'seasonal:blackfriday': {
        presetIds: ['new-bundle', 'move-inventory', 'customer-blast'],
        suggestion: 'Black Friday prep! Bundle your best deals.',
    },
    'seasonal:valentines': {
        presetIds: ['new-bundle', 'new-creative', 'customer-blast'],
        suggestion: 'Valentine\'s promotions? Share the love!',
    },
    'seasonal:summer': {
        presetIds: ['new-creative', 'plan-event', 'new-carousel'],
        suggestion: 'Summer vibes! Create seasonal content.',
    },
};

/**
 * Super User presets should focus on platform ops, growth, intel, and research by default.
 * (Business marketing presets are still available elsewhere in the UI.)
 */
const SUPER_CONTEXTUAL_PRIORITIES: Record<
    string,
    {
        presetIds: string[];
        suggestion: string;
    }
> = {
    'morning:monday': {
        presetIds: ['daily-standup', 'growth-review', 'pipeline-review'],
        suggestion: 'Kick off the week with a standup and growth/pipeline review.',
    },
    'morning:weekday': {
        presetIds: ['daily-standup', 'growth-review', 'incident-response'],
        suggestion: 'Start with a standup, then review growth and any incidents.',
    },
    'afternoon:weekday': {
        presetIds: ['customer-pulse', 'market-intel', 'content-brief'],
        suggestion: 'Midday check-in: customer pulse, market intel, and content planning.',
    },
    'afternoon:friday': {
        presetIds: ['weekly-sync', 'board-update', 'cash-flow'],
        suggestion: 'Friday wrap: exec sync, board update, and cash flow.',
    },
    'evening:weekday': {
        presetIds: ['revenue-forecast', 'compliance-audit', 'deep-research'],
        suggestion: 'Review numbers, run a compliance scan, or go deep on research.',
    },
    'night:weekday': {
        presetIds: ['incident-response', 'deep-research', 'market-analysis'],
        suggestion: 'Late-night mode: incidents, deep research, or market analysis.',
    },
    'morning:weekend': {
        presetIds: ['deep-research', 'market-analysis', 'sprint-planning'],
        suggestion: 'Weekend: research and planning time.',
    },
    'afternoon:weekend': {
        presetIds: ['market-intel', 'growth-review', 'sprint-planning'],
        suggestion: 'Weekend check: market intel, growth, and sprint planning.',
    },
};

/**
 * Grower-specific priorities focusing on wholesale and yield
 */
const GROWER_CONTEXTUAL_PRIORITIES: Record<
    string,
    {
        presetIds: string[];
        suggestion: string;
    }
> = {
    'morning:monday': {
        presetIds: ['yield-analysis', 'wholesale-inventory', 'grower-compliance-check'],
        suggestion: 'Start the week by reviewing last harvest and updating wholesale lists.',
    },
    'morning:weekday': {
        presetIds: ['yield-analysis', 'wholesale-inventory', 'grower-brand-outreach'],
        suggestion: 'Review yields or reach out to new brand partners.',
    },
    'afternoon:weekday': {
        presetIds: ['wholesale-inventory', 'grower-brand-outreach', 'grower-compliance-check'],
        suggestion: 'Manage your wholesale stock and partner relationships.',
    },
    'evening:weekday': {
        presetIds: ['yield-analysis', 'grower-brand-outreach', 'deep-research'],
        suggestion: 'Analyze performance or plan your next cultivation cycle.',
    },
};

/**
 * Generate contextual presets based on current context
 */
export function generateContextualPresets(options: ContextualPresetOptions): ContextualPresetResult {
    const { role, recentThreads = [], currentDate = new Date() } = options;

    const timeOfDay = getTimeOfDay(currentDate);
    const dayType = getDayType(currentDate);
    const seasonalEvent = getSeasonalContext(currentDate);

    const roleIsSuper = isSuperRole(role);

    // Get all available presets for this role.
    // For Super Users, prefer "super_user only" presets so they don't see brand/dispensary defaults.
    const allPresets = getQuickActionsForRole(role);
    const superOnlyPresets = roleIsSuper
        ? allPresets.filter((p) => p.roles.length === 1 && p.roles[0] === 'super_user')
        : [];
    const rolePresets = roleIsSuper && superOnlyPresets.length > 0 ? superOnlyPresets : allPresets;
    const isGrower = role === 'grower';

    let priorities = CONTEXTUAL_PRIORITIES;
    if (roleIsSuper) priorities = SUPER_CONTEXTUAL_PRIORITIES;
    if (isGrower) priorities = GROWER_CONTEXTUAL_PRIORITIES;

    let prioritizedIds: string[] = [];
    let suggestion = 'What would you like to work on today?';

    // Check seasonal first (highest priority)
    if (seasonalEvent) {
        const seasonalKey = `seasonal:${seasonalEvent}`;
        if (priorities[seasonalKey]) {
            prioritizedIds = priorities[seasonalKey].presetIds;
            suggestion = priorities[seasonalKey].suggestion;
        }
    }

    // Fall back to time + day based
    if (prioritizedIds.length === 0) {
        const contextKey = `${timeOfDay}:${dayType}`;
        if (priorities[contextKey]) {
            prioritizedIds = priorities[contextKey].presetIds;
            suggestion = priorities[contextKey].suggestion;
        } else {
            // Generic time-based fallback
            const timeKey = `${timeOfDay}:weekday`;
            if (priorities[timeKey]) {
                prioritizedIds = priorities[timeKey].presetIds;
                suggestion = priorities[timeKey].suggestion;
            }
        }
    }

    // Analyze recent activity to suggest complementary actions
    if (recentThreads.length > 0) {
        const recentTypes = new Set(recentThreads.slice(0, 5).map((t) => t.type));

        // If they've been creating carousels, suggest bundles
        if (recentTypes.has('carousel') && !recentTypes.has('bundle')) {
            const bundleAction = rolePresets.find((p) => p.id === 'new-bundle');
            if (bundleAction && !prioritizedIds.includes('new-bundle')) {
                prioritizedIds.unshift('new-bundle');
                suggestion = 'You\'ve created carousels - pair them with a bundle?';
            }
        }

        // If they created content but didn't send outreach
        if (
            (recentTypes.has('creative') || recentTypes.has('carousel')) &&
            !recentTypes.has('outreach')
        ) {
            const outreachAction = rolePresets.find((p) => p.id === 'customer-blast');
            if (outreachAction && !prioritizedIds.includes('customer-blast')) {
                prioritizedIds.push('customer-blast');
            }
        }

        // If they've been doing bundles, suggest clearance/inventory
        if (recentTypes.has('bundle') && !recentTypes.has('inventory_promo')) {
            const inventoryAction = rolePresets.find((p) => p.id === 'move-inventory');
            if (inventoryAction && !prioritizedIds.includes('move-inventory')) {
                prioritizedIds.push('move-inventory');
            }
        }
    }

    // Build final preset list
    const prioritized = prioritizedIds
        .map((id) => rolePresets.find((p) => p.id === id))
        .filter((p): p is InboxQuickAction => p !== undefined);

    // Fill remaining slots with role defaults (excluding already-included)
    const remaining = rolePresets
        .filter((p) => !prioritizedIds.includes(p.id))
        .slice(0, 4 - prioritized.length);

    return {
        presets: [...prioritized, ...remaining].slice(0, 4),
        greeting: getGreeting(timeOfDay),
        suggestion,
    };
}

/**
 * Generate rotating suggestions (for refresh button)
 */
export function getRotatingPresets(
    options: ContextualPresetOptions,
    exclude: string[] = []
): InboxQuickAction[] {
    const { role } = options;
    const allPresets = getQuickActionsForRole(role);
    const rolePresets = isSuperRole(role)
        ? allPresets.filter((p) => p.roles.length === 1 && p.roles[0] === 'super_user')
        : allPresets;

    // Shuffle and return 4 that aren't in exclude list
    const available = rolePresets.filter((p) => !exclude.includes(p.id));

    // Fisher-Yates shuffle
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }

    return available.slice(0, 4);
}
