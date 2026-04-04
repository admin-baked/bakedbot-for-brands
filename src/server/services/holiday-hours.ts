/**
 * Holiday Hours Service
 *
 * Detects upcoming US holidays and fetches competitor dispensary hours
 * via Google Places API for proactive briefing in Uncle Elroy's daily cron.
 *
 * Used by:
 *   - Elroy agent (get_competitor_holiday_hours tool)
 *   - Thrive daily briefing cron (holiday alert block)
 */

import { resolvePlaceId, fetchPlaceSnapshot } from '@/server/services/places-connector';
import { logger } from '@/lib/logger';

// ============================================================================
// HOLIDAY CALENDAR (cannabis-relevant US holidays)
// ============================================================================

export interface Holiday {
    name: string;
    date: Date;
    daysUntil: number;
    /** Typical impact on cannabis retail foot traffic */
    trafficImpact: 'high' | 'medium' | 'low';
    /** Whether many dispensaries change hours on this day */
    likelyHoursChange: boolean;
}

const HOLIDAYS_2026: Array<{ name: string; month: number; day: number; trafficImpact: 'high' | 'medium' | 'low'; likelyHoursChange: boolean }> = [
    { name: "New Year's Day",     month: 1,  day: 1,  trafficImpact: 'medium', likelyHoursChange: true  },
    { name: 'Martin Luther King Jr. Day', month: 1, day: 19, trafficImpact: 'low', likelyHoursChange: false },
    { name: "Valentine's Day",    month: 2,  day: 14, trafficImpact: 'medium', likelyHoursChange: false },
    { name: "St. Patrick's Day",  month: 3,  day: 17, trafficImpact: 'medium', likelyHoursChange: false },
    { name: 'Easter Sunday',      month: 4,  day: 5,  trafficImpact: 'medium', likelyHoursChange: true  },
    { name: 'Easter Monday',      month: 4,  day: 6,  trafficImpact: 'low',    likelyHoursChange: true  },
    { name: 'Memorial Day',       month: 5,  day: 25, trafficImpact: 'high',   likelyHoursChange: true  },
    { name: '4/20',               month: 4,  day: 20, trafficImpact: 'high',   likelyHoursChange: false },
    { name: "Mother's Day",       month: 5,  day: 10, trafficImpact: 'medium', likelyHoursChange: false },
    { name: "Father's Day",       month: 6,  day: 21, trafficImpact: 'low',    likelyHoursChange: false },
    { name: 'Independence Day',   month: 7,  day: 4,  trafficImpact: 'high',   likelyHoursChange: true  },
    { name: 'Labor Day',          month: 9,  day: 7,  trafficImpact: 'high',   likelyHoursChange: true  },
    { name: 'Halloween',          month: 10, day: 31, trafficImpact: 'medium', likelyHoursChange: false },
    { name: 'Veterans Day',       month: 11, day: 11, trafficImpact: 'low',    likelyHoursChange: false },
    { name: 'Thanksgiving',       month: 11, day: 26, trafficImpact: 'high',   likelyHoursChange: true  },
    { name: 'Black Friday',       month: 11, day: 27, trafficImpact: 'high',   likelyHoursChange: false },
    { name: 'Christmas Eve',      month: 12, day: 24, trafficImpact: 'medium', likelyHoursChange: true  },
    { name: 'Christmas Day',      month: 12, day: 25, trafficImpact: 'medium', likelyHoursChange: true  },
    { name: "New Year's Eve",     month: 12, day: 31, trafficImpact: 'medium', likelyHoursChange: true  },
];

/**
 * Return holidays occurring within `daysAhead` days from now (ET timezone).
 */
export function getUpcomingHolidays(daysAhead = 7): Holiday[] {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + daysAhead);

    const year = now.getFullYear();
    const upcoming: Holiday[] = [];

    for (const h of HOLIDAYS_2026) {
        // Check current year and next year (for end-of-year window)
        for (const y of [year, year + 1]) {
            const hDate = new Date(y, h.month - 1, h.day);
            if (hDate >= now && hDate <= cutoff) {
                const ms = hDate.getTime() - now.getTime();
                const daysUntil = Math.floor(ms / 86_400_000);
                upcoming.push({ ...h, date: hDate, daysUntil });
            }
        }
    }

    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}

// ============================================================================
// SYRACUSE COMPETITOR REGISTRY
// ============================================================================

export interface CompetitorInfo {
    name: string;
    address: string;
    weedmapsSlug?: string;
}

/** Known competitors in the Syracuse, NY market */
export const SYRACUSE_COMPETITORS: CompetitorInfo[] = [
    { name: 'FlnnStoned Cannabis',     address: '350 S Clinton St, Syracuse, NY 13202', weedmapsSlug: 'flnnstoned-cannabis' },
    { name: 'Smacked Village',         address: 'Syracuse, NY',                          weedmapsSlug: 'smacked-village-syracuse' },
    { name: 'Terp Bros Dispensary',    address: 'Syracuse, NY',                          weedmapsSlug: 'terp-bros-dispensary-syracuse' },
    { name: 'Green Thumb Industries',  address: 'Syracuse, NY',                                                                     },
];

// ============================================================================
// COMPETITOR HOURS LOOKUP
// ============================================================================

export interface CompetitorHours {
    name: string;
    address: string;
    isOpenNow: boolean | null;
    weekdayDescriptions: string[];
    specialNote: string | null;    // e.g. "Holiday hours" from Google
    source: 'google_places' | 'unavailable';
}

/**
 * Fetch current/special hours for known Syracuse competitors via Google Places API.
 * Returns results for as many competitors as Places resolves — gracefully skips failures.
 */
export async function fetchCompetitorHolidayHours(
    competitors: CompetitorInfo[] = SYRACUSE_COMPETITORS
): Promise<CompetitorHours[]> {
    const results: CompetitorHours[] = [];

    await Promise.allSettled(
        competitors.map(async (c) => {
            try {
                const resolved = await resolvePlaceId(c.name, c.address);
                if (!resolved || resolved.confidence < 0.5) {
                    results.push({
                        name: c.name,
                        address: c.address,
                        isOpenNow: null,
                        weekdayDescriptions: [],
                        specialNote: null,
                        source: 'unavailable',
                    });
                    return;
                }

                const snapshot = await fetchPlaceSnapshot(resolved.placeId, [
                    'currentOpeningHours',
                    'regularOpeningHours',
                    'displayName',
                    'formattedAddress',
                ]);

                if (!snapshot) {
                    results.push({
                        name: c.name,
                        address: c.address,
                        isOpenNow: null,
                        weekdayDescriptions: [],
                        specialNote: null,
                        source: 'unavailable',
                    });
                    return;
                }

                const hours = snapshot.currentOpeningHours ?? snapshot.regularOpeningHours;
                const weekdayDescs = hours?.weekdayDescriptions ?? [];

                // Google sets a special holiday note in weekdayDescriptions or openNow
                // Detect if today/tomorrow shows unusual hours in the description
                const specialNote = detectSpecialHoursNote(weekdayDescs);

                results.push({
                    name: snapshot.displayName || c.name,
                    address: snapshot.formattedAddress || c.address,
                    isOpenNow: hours?.openNow ?? null,
                    weekdayDescriptions: weekdayDescs,
                    specialNote,
                    source: 'google_places',
                });
            } catch (err: any) {
                logger.warn('[HolidayHours] Failed to fetch hours', { competitor: c.name, error: err.message });
                results.push({
                    name: c.name,
                    address: c.address,
                    isOpenNow: null,
                    weekdayDescriptions: [],
                    specialNote: null,
                    source: 'unavailable',
                });
            }
        })
    );

    return results;
}

/**
 * Look for Google's holiday hours markers in weekday descriptions.
 * Google typically writes things like "Closed (Holiday hours)" or different times.
 */
function detectSpecialHoursNote(weekdayDescriptions: string[]): string | null {
    const keywords = ['holiday', 'special', 'closed', 'early', 'reduced'];
    for (const desc of weekdayDescriptions) {
        const lower = desc.toLowerCase();
        if (keywords.some((kw) => lower.includes(kw))) {
            return desc;
        }
    }
    return null;
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format competitor hours for Slack Block Kit or plain text.
 * Returns compact lines like: "• FlnnStoned: Closed today (Easter)"
 */
export function formatHoursForSlack(
    hours: CompetitorHours[],
    holiday: Holiday
): string {
    const lines: string[] = [];

    for (const c of hours) {
        if (c.source === 'unavailable') {
            lines.push(`• *${c.name}*: hours unavailable — check their site`);
            continue;
        }

        if (c.specialNote) {
            lines.push(`• *${c.name}*: ${c.specialNote}`);
        } else {
            const status = c.isOpenNow === true ? 'open now' : c.isOpenNow === false ? 'currently closed' : 'status unknown';
            lines.push(`• *${c.name}*: ${status} (no special ${holiday.name} hours detected)`);
        }
    }

    return lines.join('\n') || '_No competitor hours data available_';
}
