/**
 * Agent Response Formatter
 *
 * Post-processes agent responses to replace template placeholders
 * with actual values. This fixes issues where LLMs output template
 * strings instead of computed values.
 */

/**
 * Replace template placeholders in agent responses with actual values.
 *
 * Handles common patterns like:
 * - [Current Date/Time]
 * - [DATE]
 * - [TIME]
 * - [TIMESTAMP]
 * - {{date}}
 * - {{time}}
 * - {{timestamp}}
 */
export function formatAgentResponse(response: string): string {
    if (!response) return response;

    const now = new Date();

    // Format options
    const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    const timestampStr = now.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const isoStr = now.toISOString();

    // Replacement patterns (case-insensitive)
    const replacements: Array<[RegExp, string]> = [
        // Bracket patterns
        [/\[Current Date\/Time\]/gi, timestampStr],
        [/\[Current Date and Time\]/gi, timestampStr],
        [/\[CURRENT_DATE_TIME\]/gi, timestampStr],
        [/\[DATE\/TIME\]/gi, timestampStr],
        [/\[DATETIME\]/gi, timestampStr],
        [/\[DATE\]/gi, dateStr],
        [/\[TIME\]/gi, timeStr],
        [/\[TIMESTAMP\]/gi, timestampStr],
        [/\[ISO_TIMESTAMP\]/gi, isoStr],
        [/\[NOW\]/gi, timestampStr],

        // Mustache patterns
        [/\{\{date\}\}/gi, dateStr],
        [/\{\{time\}\}/gi, timeStr],
        [/\{\{timestamp\}\}/gi, timestampStr],
        [/\{\{datetime\}\}/gi, timestampStr],
        [/\{\{now\}\}/gi, timestampStr],

        // Dollar patterns
        [/\$\{date\}/gi, dateStr],
        [/\$\{time\}/gi, timeStr],
        [/\$\{timestamp\}/gi, timestampStr],
        [/\$\{datetime\}/gi, timestampStr],
    ];

    let formatted = response;
    for (const [pattern, replacement] of replacements) {
        formatted = formatted.replace(pattern, replacement);
    }

    return formatted;
}

/**
 * Check if a response contains unprocessed template placeholders.
 * Useful for validation and debugging.
 */
export function hasUnprocessedTemplates(response: string): boolean {
    if (!response) return false;

    const templatePatterns = [
        /\[Current Date/i,
        /\[DATE\]/i,
        /\[TIME\]/i,
        /\[TIMESTAMP\]/i,
        /\{\{date\}\}/i,
        /\{\{time\}\}/i,
        /\{\{timestamp\}\}/i,
    ];

    return templatePatterns.some(pattern => pattern.test(response));
}
