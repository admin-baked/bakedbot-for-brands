/**
 * Playbook Scheduler
 *
 * Utilities for:
 *   - computeNextRunAt: given a cron expression + timezone, return the next
 *     Date the job should run (used after each execution to advance nextRunAt)
 *   - parseScheduleIntent: Claude parses natural language like "every Monday
 *     at 9am" into a ScheduleSpec the dispatcher understands
 */

import { CronExpressionParser } from 'cron-parser';
import { callClaude } from '@/ai/claude';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduleSpec {
    /** Standard 5-field cron expression  e.g. "0 9 * * 1" */
    schedule: string;
    /** IANA timezone  e.g. "America/New_York" */
    timezone: string;
    /** Human-readable description  e.g. "Every Monday at 9:00 AM ET" */
    description: string;
    /** Handler key to look up in the registry */
    handler: string;
    /** Handler-specific config extracted from the user's intent */
    config: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// computeNextRunAt
// ---------------------------------------------------------------------------

/**
 * Given a cron expression and timezone, return the next Date the job
 * should run after `from` (defaults to now).
 */
export function computeNextRunAt(schedule: string, timezone: string, from?: Date): Date {
    const interval = CronExpressionParser.parse(schedule, {
        currentDate: from ?? new Date(),
        tz: timezone,
    });
    return interval.next().toDate();
}

// ---------------------------------------------------------------------------
// parseScheduleIntent — Claude extracts a ScheduleSpec from free text
// ---------------------------------------------------------------------------

const HANDLER_OPTIONS = [
    'daily-recap',
    'revenue-pace-alert',
    'checkin-digest',
    'competitive-snapshot',
    'weekly-loyalty-health',
    'custom-report',
] as const;

export type HandlerKey = typeof HANDLER_OPTIONS[number];

export async function parseScheduleIntent(
    userIntent: string,
    orgTimezone = 'America/New_York'
): Promise<ScheduleSpec> {
    const prompt = `You are a scheduling assistant for a cannabis dispensary SaaS called BakedBot.
The user wants to schedule an automated playbook. Extract a structured schedule spec from their request.

Available handler types:
- daily-recap: daily orders/revenue summary
- revenue-pace-alert: intra-day revenue threshold alert (sub-hourly)
- checkin-digest: daily count of walk-in check-ins
- competitive-snapshot: pull latest competitor intel and summarize
- weekly-loyalty-health: weekly loyalty program health report
- custom-report: anything else (general AI-generated report)

User's org timezone: ${orgTimezone}

User request: "${userIntent}"

Respond with ONLY valid JSON (no markdown):
{
  "schedule": "<5-field cron e.g. 0 9 * * 1>",
  "timezone": "<IANA tz e.g. America/New_York>",
  "description": "<human readable e.g. Every Monday at 9:00 AM ET>",
  "handler": "<one of the handler types above>",
  "config": {
    "thresholdUsd": <number if revenue alert, else omit>,
    "competitor": "<competitor name if competitive snapshot, else omit>",
    "deliverTo": "<email if mentioned, else omit>"
  }
}`;

    let raw = '';
    try {
        raw = await callClaude({ userMessage: prompt, model: 'claude-haiku-4-5-20251001', maxTokens: 400 });
        const cleaned = raw.match(/\{[\s\S]*\}/)?.[0];
        if (!cleaned) throw new Error('No JSON found');
        const parsed = JSON.parse(cleaned) as ScheduleSpec;
        // Validate cron expression is parseable
        computeNextRunAt(parsed.schedule, parsed.timezone ?? orgTimezone);
        return { ...parsed, timezone: parsed.timezone ?? orgTimezone };
    } catch (err) {
        logger.warn('[Scheduler] Failed to parse schedule intent', { userIntent, error: err, raw });
        // Safe fallback: daily at 9am org timezone
        return {
            schedule: '0 9 * * *',
            timezone: orgTimezone,
            description: 'Daily at 9:00 AM',
            handler: 'custom-report',
            config: {},
        };
    }
}
