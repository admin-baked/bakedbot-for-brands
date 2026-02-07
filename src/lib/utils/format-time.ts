/**
 * Unified Time Formatting Utility
 *
 * Provides consistent time display across inbox components.
 * Supports both abbreviated ("5m") and full ("5 minutes ago") formats.
 */

interface FormatTimeOptions {
    abbreviated?: boolean; // "5m" vs "5 minutes ago"
    showSuffix?: boolean; // Include "ago" suffix
}

/**
 * Format a date/time relative to now with smart formatting.
 *
 * - Under 1 minute: "now"
 * - Under 1 hour: "5m" / "5 minutes ago"
 * - Under 24 hours: "3h" / "3 hours ago"
 * - Under 7 days: "2d" / "2 days ago"
 * - Otherwise: "Jan 5" (short month + day)
 *
 * @param date - Date to format (Date object or string)
 * @param options - Formatting options
 * @returns Formatted time string
 */
export function formatSmartTime(
    date: Date | string,
    options: FormatTimeOptions = {}
): string {
    const { abbreviated = true, showSuffix = false } = options;

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    // Just now
    if (diffMins < 1) return 'now';

    // Minutes
    if (diffMins < 60) {
        if (abbreviated) {
            return `${diffMins}m${showSuffix ? ' ago' : ''}`;
        }
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }

    // Hours
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) {
        if (abbreviated) {
            return `${diffHours}h${showSuffix ? ' ago' : ''}`;
        }
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }

    // Days (within a week)
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 7) {
        if (abbreviated) {
            return `${diffDays}d${showSuffix ? ' ago' : ''}`;
        }
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }

    // Older than a week - show date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format relative time with full words (no abbreviation).
 * Convenience wrapper for formatSmartTime with abbreviated=false.
 */
export function formatRelativeTimeFull(date: Date | string): string {
    return formatSmartTime(date, { abbreviated: false });
}

/**
 * Format time for display in lists (abbreviated, no suffix).
 * Convenience wrapper for compact display.
 */
export function formatListTime(date: Date | string): string {
    return formatSmartTime(date, { abbreviated: true, showSuffix: false });
}
