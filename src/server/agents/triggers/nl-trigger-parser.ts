/**
 * Natural Language Trigger Parser
 * 
 * Parses natural language schedule/trigger requests into structured triggers.
 * Inspired by Tasklet.ai's NL trigger setup pattern.
 */

export type TriggerType = 'schedule' | 'event' | 'manual';

export interface ScheduleTrigger {
    type: 'schedule';
    schedule: string;  // Cron expression
    timezone: string;
    humanReadable: string;
}

export interface EventTrigger {
    type: 'event';
    eventName: string;
    conditions?: Record<string, unknown>;
    humanReadable: string;
}

export interface ManualTrigger {
    type: 'manual';
    humanReadable: string;
}

export type PlaybookTrigger = ScheduleTrigger | EventTrigger | ManualTrigger;

// =============================================================================
// SCHEDULE PATTERNS
// =============================================================================

interface SchedulePattern {
    patterns: RegExp[];
    cron: string;
    humanReadable: string;
}

const SCHEDULE_PATTERNS: SchedulePattern[] = [
    // Every day at specific time
    {
        patterns: [
            /every day at (\d{1,2})(:\d{2})?\s*(am|pm)/i,
            /daily at (\d{1,2})(:\d{2})?\s*(am|pm)/i,
        ],
        cron: '', // Computed dynamically
        humanReadable: 'Every day at {time}',
    },
    // Every weekday
    {
        patterns: [
            /every weekday at (\d{1,2})(:\d{2})?\s*(am|pm)/i,
            /weekdays at (\d{1,2})(:\d{2})?\s*(am|pm)/i,
        ],
        cron: '', // Computed dynamically
        humanReadable: 'Every weekday at {time}',
    },
    // Specific day of week
    {
        patterns: [
            /every (monday|tuesday|wednesday|thursday|friday|saturday|sunday) at (\d{1,2})(:\d{2})?\s*(am|pm)/i,
        ],
        cron: '', // Computed dynamically
        humanReadable: 'Every {day} at {time}',
    },
    // Hourly
    {
        patterns: [
            /every hour/i,
            /hourly/i,
        ],
        cron: '0 * * * *',
        humanReadable: 'Every hour',
    },
    // Every X hours
    {
        patterns: [
            /every (\d+) hours?/i,
        ],
        cron: '', // Computed dynamically
        humanReadable: 'Every {n} hours',
    },
    // Weekly
    {
        patterns: [
            /every week on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
            /weekly on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        ],
        cron: '', // Computed dynamically
        humanReadable: 'Every week on {day}',
    },
    // Monthly
    {
        patterns: [
            /every month on the (\d{1,2})(st|nd|rd|th)?/i,
            /monthly on the (\d{1,2})(st|nd|rd|th)?/i,
        ],
        cron: '', // Computed dynamically
        humanReadable: 'Every month on the {day}',
    },
];

// =============================================================================
// EVENT PATTERNS
// =============================================================================

interface EventPattern {
    patterns: RegExp[];
    eventName: string;
    humanReadable: string;
}

const EVENT_PATTERNS: EventPattern[] = [
    // Inventory alerts
    {
        patterns: [
            /when (stock|inventory) (drops|falls) below (\d+)/i,
            /alert.*when.*stock.*below (\d+)/i,
        ],
        eventName: 'inventory.low',
        humanReadable: 'When stock drops below {threshold}',
    },
    // Price changes
    {
        patterns: [
            /when.*competitor.*price.*(drops|changes|increases)/i,
            /alert.*price.*(change|drop)/i,
        ],
        eventName: 'competitor.priceChange',
        humanReadable: 'When competitor price changes',
    },
    // New orders
    {
        patterns: [
            /when.*(new|incoming) order/i,
            /on new order/i,
        ],
        eventName: 'order.new',
        humanReadable: 'When a new order is placed',
    },
    // Customer events
    {
        patterns: [
            /when customer.*(signs up|registers)/i,
            /on new customer/i,
        ],
        eventName: 'customer.signup',
        humanReadable: 'When a new customer signs up',
    },
    // Churn risk
    {
        patterns: [
            /when customer.*(inactive|at risk|churn)/i,
            /customer.*hasn't.*visited/i,
        ],
        eventName: 'customer.churnRisk',
        humanReadable: 'When customer is at risk of churning',
    },
];

// =============================================================================
// PARSER FUNCTIONS
// =============================================================================

/**
 * Parse natural language trigger input
 */
export function parseNaturalLanguageTrigger(input: string): PlaybookTrigger {
    const normalized = input.toLowerCase().trim();
    
    // Try to match schedule patterns
    const scheduleTrigger = parseScheduleTrigger(normalized);
    if (scheduleTrigger) return scheduleTrigger;
    
    // Try to match event patterns
    const eventTrigger = parseEventTrigger(normalized);
    if (eventTrigger) return eventTrigger;
    
    // Default to manual trigger
    return {
        type: 'manual',
        humanReadable: 'Run manually',
    };
}

/**
 * Parse schedule-based trigger
 */
function parseScheduleTrigger(input: string): ScheduleTrigger | null {
    // Every day at X
    const dailyMatch = input.match(/(?:every day|daily) at (\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (dailyMatch) {
        const hour = parseHour(dailyMatch[1], dailyMatch[3]);
        const minute = dailyMatch[2] ? parseInt(dailyMatch[2]) : 0;
        return {
            type: 'schedule',
            schedule: `${minute} ${hour} * * *`,
            timezone: 'America/Chicago',
            humanReadable: `Every day at ${dailyMatch[1]}${dailyMatch[2] ? ':' + dailyMatch[2] : ':00'} ${dailyMatch[3].toUpperCase()}`,
        };
    }
    
    // Every weekday at X
    const weekdayMatch = input.match(/(?:every weekday|weekdays) at (\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (weekdayMatch) {
        const hour = parseHour(weekdayMatch[1], weekdayMatch[3]);
        const minute = weekdayMatch[2] ? parseInt(weekdayMatch[2]) : 0;
        return {
            type: 'schedule',
            schedule: `${minute} ${hour} * * 1-5`,
            timezone: 'America/Chicago',
            humanReadable: `Every weekday at ${weekdayMatch[1]}${weekdayMatch[2] ? ':' + weekdayMatch[2] : ':00'} ${weekdayMatch[3].toUpperCase()}`,
        };
    }
    
    // Every [day of week] at X
    const dayOfWeekMatch = input.match(/every (monday|tuesday|wednesday|thursday|friday|saturday|sunday) at (\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (dayOfWeekMatch) {
        const dayNum = getDayNumber(dayOfWeekMatch[1]);
        const hour = parseHour(dayOfWeekMatch[2], dayOfWeekMatch[4]);
        const minute = dayOfWeekMatch[3] ? parseInt(dayOfWeekMatch[3]) : 0;
        return {
            type: 'schedule',
            schedule: `${minute} ${hour} * * ${dayNum}`,
            timezone: 'America/Chicago',
            humanReadable: `Every ${capitalize(dayOfWeekMatch[1])} at ${dayOfWeekMatch[2]}${dayOfWeekMatch[3] ? ':' + dayOfWeekMatch[3] : ':00'} ${dayOfWeekMatch[4].toUpperCase()}`,
        };
    }
    
    // Every hour
    if (input.match(/(?:every hour|hourly)/i)) {
        return {
            type: 'schedule',
            schedule: '0 * * * *',
            timezone: 'America/Chicago',
            humanReadable: 'Every hour',
        };
    }
    
    // Every X hours
    const everyXHoursMatch = input.match(/every (\d+) hours?/i);
    if (everyXHoursMatch) {
        const hours = parseInt(everyXHoursMatch[1]);
        return {
            type: 'schedule',
            schedule: `0 */${hours} * * *`,
            timezone: 'America/Chicago',
            humanReadable: `Every ${hours} hour${hours > 1 ? 's' : ''}`,
        };
    }
    
    // Weekly on [day]
    const weeklyMatch = input.match(/(?:every week|weekly) on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (weeklyMatch) {
        const dayNum = getDayNumber(weeklyMatch[1]);
        return {
            type: 'schedule',
            schedule: `0 9 * * ${dayNum}`,  // Default to 9am
            timezone: 'America/Chicago',
            humanReadable: `Every ${capitalize(weeklyMatch[1])} at 9:00 AM`,
        };
    }
    
    return null;
}

/**
 * Parse event-based trigger
 */
function parseEventTrigger(input: string): EventTrigger | null {
    // Inventory low
    const inventoryMatch = input.match(/(?:when|if).*(?:stock|inventory).*(?:drops|falls|below)\s*(\d+)/i);
    if (inventoryMatch) {
        return {
            type: 'event',
            eventName: 'inventory.low',
            conditions: { threshold: parseInt(inventoryMatch[1]) },
            humanReadable: `When stock drops below ${inventoryMatch[1]} units`,
        };
    }
    
    // Price change
    if (input.match(/(?:when|if).*competitor.*price.*(?:drops|changes|increases)/i)) {
        const thresholdMatch = input.match(/(\d+)%/);
        return {
            type: 'event',
            eventName: 'competitor.priceChange',
            conditions: thresholdMatch ? { thresholdPercent: parseInt(thresholdMatch[1]) } : undefined,
            humanReadable: `When competitor price changes${thresholdMatch ? ` by ${thresholdMatch[1]}%` : ''}`,
        };
    }
    
    // New order
    if (input.match(/(?:when|on).*(?:new|incoming) order/i)) {
        return {
            type: 'event',
            eventName: 'order.new',
            humanReadable: 'When a new order is placed',
        };
    }
    
    // New customer
    if (input.match(/(?:when|on).*(?:new customer|customer signs up)/i)) {
        return {
            type: 'event',
            eventName: 'customer.signup',
            humanReadable: 'When a new customer signs up',
        };
    }
    
    return null;
}

// =============================================================================
// HELPERS
// =============================================================================

function parseHour(hourStr: string, ampm: string): number {
    let hour = parseInt(hourStr);
    if (ampm.toLowerCase() === 'pm' && hour !== 12) {
        hour += 12;
    } else if (ampm.toLowerCase() === 'am' && hour === 12) {
        hour = 0;
    }
    return hour;
}

function getDayNumber(day: string): number {
    const days: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
    };
    return days[day.toLowerCase()] ?? 1;
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate a cron expression
 */
export function isValidCron(cron: string): boolean {
    const parts = cron.split(' ');
    if (parts.length !== 5) return false;
    
    // Basic validation - each part should be valid
    const patterns = [
        /^(\*|\d+|\*\/\d+)$/,  // minute
        /^(\*|\d+|\*\/\d+)$/,  // hour
        /^(\*|\d+|\*\/\d+)$/,  // day of month
        /^(\*|\d+|\*\/\d+)$/,  // month
        /^(\*|\d+|\d+-\d+)$/,  // day of week
    ];
    
    return parts.every((part, i) => patterns[i].test(part));
}

/**
 * Get human-readable description of a cron expression
 */
export function cronToHumanReadable(cron: string): string {
    const parts = cron.split(' ');
    if (parts.length !== 5) return 'Invalid schedule';
    
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    if (hour === '*' && minute === '0') {
        return 'Every hour';
    }
    
    if (hour.startsWith('*/')) {
        const interval = parseInt(hour.slice(2));
        return `Every ${interval} hours`;
    }
    
    if (dayOfWeek === '1-5') {
        return `Every weekday at ${formatTime(parseInt(hour), parseInt(minute))}`;
    }
    
    if (dayOfWeek !== '*' && dayOfMonth === '*') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Every ${days[parseInt(dayOfWeek)]} at ${formatTime(parseInt(hour), parseInt(minute))}`;
    }
    
    if (dayOfMonth === '*' && dayOfWeek === '*') {
        return `Every day at ${formatTime(parseInt(hour), parseInt(minute))}`;
    }
    
    return `At ${formatTime(parseInt(hour), parseInt(minute))} on day ${dayOfMonth}`;
}

function formatTime(hour: number, minute: number): string {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${ampm}`;
}
