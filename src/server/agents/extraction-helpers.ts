/**
 * Structured Extraction Helpers
 *
 * Extract parameters from natural language without LLM.
 * Much faster and cheaper than using ai.generate() for simple parsing.
 */

import { GmailParams } from '@/server/tools/gmail';
import { CalendarParams } from '@/server/tools/calendar';

/**
 * Extract Gmail action parameters from natural language without LLM.
 * Much faster and cheaper than using ai.generate() for simple parsing.
 */
export function extractGmailParams(message: string): GmailParams {
    const lower = message.toLowerCase();

    // Detect action type
    if (/send\s+(an?\s+)?email|email\s+to|compose|write\s+to/i.test(message)) {
        // Extract recipient
        const toMatch = message.match(/(?:to|email)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        // Extract subject
        const subjectMatch = message.match(/subject[:\s]+["']?([^"'\n]+?)["']?(?:\s+(?:with|body|message)|$)/i);
        // Extract body (everything after "body:", "message:", or "saying")
        const bodyMatch = message.match(/(?:body|message|saying)[:\s]+["']?(.+?)["']?$/i);

        return {
            action: 'send',
            to: toMatch?.[1] || '',
            subject: subjectMatch?.[1] || 'Message from BakedBot',
            body: bodyMatch?.[1] || message,
        };
    }

    if (/read\s+(email|message)|open\s+email|show\s+email/i.test(message)) {
        // Extract message ID if mentioned
        const idMatch = message.match(/(?:id|message)\s*[:#]?\s*([a-zA-Z0-9]+)/i);
        return {
            action: 'read',
            messageId: idMatch?.[1] || '',
        };
    }

    // Detect connection/setup intent — user wants to authorize Gmail, not perform an action
    if (/\b(connect|setup|authorize|authenticate|enable|link|add)\b/i.test(message) && /gmail/i.test(message)) {
        return { action: 'list', query: '__connect__' };
    }

    // Default to list
    let query = 'is:unread';
    if (/unread/i.test(message)) query = 'is:unread';
    else if (/sent/i.test(message)) query = 'in:sent';
    else if (/starred|important/i.test(message)) query = 'is:starred';
    else if (/today/i.test(message)) query = 'newer_than:1d';

    return { action: 'list', query };
}

/**
 * Extract Calendar action parameters from natural language without LLM.
 */
export function extractCalendarParams(message: string): CalendarParams {
    const lower = message.toLowerCase();
    const now = new Date();

    // Detect create action
    if (/schedule|create|add|set\s+up|book/i.test(message) && /event|meeting|appointment/i.test(message)) {
        // Extract event summary
        const summaryMatch = message.match(/(?:called|titled|named|for)\s+["']?([^"'\n]+?)["']?(?:\s+(?:at|on|from)|$)/i);

        // Extract time - basic patterns
        let startTime = new Date(now.getTime() + 3600000); // Default 1 hour from now
        let endTime = new Date(startTime.getTime() + 3600000); // 1 hour duration

        // Try to parse time mentions
        const timeMatch = message.match(/at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2] || '0');
            const meridiem = timeMatch[3]?.toLowerCase();
            if (meridiem === 'pm' && hours < 12) hours += 12;
            if (meridiem === 'am' && hours === 12) hours = 0;
            startTime.setHours(hours, minutes, 0, 0);
            endTime = new Date(startTime.getTime() + 3600000);
        }

        return {
            action: 'create',
            summary: summaryMatch?.[1] || 'New Event',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
        };
    }

    // Default to list
    let maxResults = 10;
    if (/today/i.test(message)) {
        // Today's events
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        return {
            action: 'list',
            timeMin: now.toISOString(),
            timeMax: endOfDay.toISOString(),
            maxResults,
        };
    }

    if (/this\s+week/i.test(message)) {
        const endOfWeek = new Date(now);
        endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
        return {
            action: 'list',
            timeMin: now.toISOString(),
            timeMax: endOfWeek.toISOString(),
            maxResults,
        };
    }

    // Default: next 7 days
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
        action: 'list',
        timeMin: now.toISOString(),
        timeMax: weekLater.toISOString(),
        maxResults,
    };
}
