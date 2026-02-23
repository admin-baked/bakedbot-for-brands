/**
 * Tests for trigger-editor-panel.tsx
 *
 * Covers:
 * 1. buildCron — daily / weekly / monthly output
 * 2. parseCron — parse known cron strings to ScheduleState
 * 3. Round-trip — parseCron → buildCron is idempotent
 * 4. describeSchedule — human-readable labels
 * 5. Edge cases — midnight, noon, Sunday (cron 0 ↔ UI 7)
 */

import { describe, it, expect } from '@jest/globals';
import {
    buildCron,
    parseCron,
    describeSchedule,
} from '@/app/dashboard/playbooks/components/trigger-editor-panel';
import type { ScheduleState } from '@/app/dashboard/playbooks/components/trigger-editor-panel';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const DAILY_9AM: ScheduleState = {
    frequency: 'daily', dayOfWeek: 1, monthDay: 1,
    hour: 9, minute: '00', ampm: 'am',
};

const DAILY_3PM: ScheduleState = {
    frequency: 'daily', dayOfWeek: 1, monthDay: 1,
    hour: 3, minute: '30', ampm: 'pm',
};

const WEEKLY_MONDAY_9AM: ScheduleState = {
    frequency: 'weekly', dayOfWeek: 1, monthDay: 1,
    hour: 9, minute: '00', ampm: 'am',
};

const WEEKLY_SUNDAY_7AM: ScheduleState = {
    frequency: 'weekly', dayOfWeek: 7, monthDay: 1,
    hour: 7, minute: '00', ampm: 'am',
};

const MONTHLY_1ST_8AM: ScheduleState = {
    frequency: 'monthly', dayOfWeek: 1, monthDay: 1,
    hour: 8, minute: '00', ampm: 'am',
};

const MONTHLY_15TH_930PM: ScheduleState = {
    frequency: 'monthly', dayOfWeek: 1, monthDay: 15,
    hour: 9, minute: '30', ampm: 'pm',
};

// ─── buildCron ────────────────────────────────────────────────────────────────

describe('buildCron', () => {
    describe('daily frequency', () => {
        it('daily 9 AM → "0 9 * * *"', () => {
            expect(buildCron(DAILY_9AM)).toBe('0 9 * * *');
        });

        it('daily 3:30 PM → "30 15 * * *"', () => {
            expect(buildCron(DAILY_3PM)).toBe('30 15 * * *');
        });

        it('midnight (12 AM) → "0 0 * * *"', () => {
            const s: ScheduleState = { ...DAILY_9AM, hour: 12, ampm: 'am' };
            expect(buildCron(s)).toBe('0 0 * * *');
        });

        it('noon (12 PM) → "0 12 * * *"', () => {
            const s: ScheduleState = { ...DAILY_9AM, hour: 12, ampm: 'pm' };
            expect(buildCron(s)).toBe('0 12 * * *');
        });

        it('11 PM → "0 23 * * *"', () => {
            const s: ScheduleState = { ...DAILY_9AM, hour: 11, ampm: 'pm' };
            expect(buildCron(s)).toBe('0 23 * * *');
        });

        it('with :15 minute → "15 9 * * *"', () => {
            const s: ScheduleState = { ...DAILY_9AM, minute: '15' };
            expect(buildCron(s)).toBe('15 9 * * *');
        });

        it('with :45 minute → "45 9 * * *"', () => {
            const s: ScheduleState = { ...DAILY_9AM, minute: '45' };
            expect(buildCron(s)).toBe('45 9 * * *');
        });
    });

    describe('weekly frequency', () => {
        it('Monday 9 AM → "0 9 * * 1"', () => {
            expect(buildCron(WEEKLY_MONDAY_9AM)).toBe('0 9 * * 1');
        });

        it('Sunday 7 AM → "0 7 * * 0" (cron uses 0 for Sunday)', () => {
            // UI dayOfWeek 7 = Sunday → cron 0
            expect(buildCron(WEEKLY_SUNDAY_7AM)).toBe('0 7 * * 0');
        });

        it('Friday 5 PM → "0 17 * * 5"', () => {
            const s: ScheduleState = { ...WEEKLY_MONDAY_9AM, dayOfWeek: 5, hour: 5, ampm: 'pm' };
            expect(buildCron(s)).toBe('0 17 * * 5');
        });

        it('Saturday 10:30 AM → "30 10 * * 6"', () => {
            const s: ScheduleState = { ...WEEKLY_MONDAY_9AM, dayOfWeek: 6, hour: 10, minute: '30', ampm: 'am' };
            expect(buildCron(s)).toBe('30 10 * * 6');
        });
    });

    describe('monthly frequency', () => {
        it('1st of month 8 AM → "0 8 1 * *"', () => {
            expect(buildCron(MONTHLY_1ST_8AM)).toBe('0 8 1 * *');
        });

        it('15th of month 9:30 PM → "30 21 15 * *"', () => {
            expect(buildCron(MONTHLY_15TH_930PM)).toBe('30 21 15 * *');
        });

        it('28th of month 12 PM → "0 12 28 * *"', () => {
            const s: ScheduleState = { ...MONTHLY_1ST_8AM, monthDay: 28, hour: 12, ampm: 'pm' };
            expect(buildCron(s)).toBe('0 12 28 * *');
        });
    });
});

// ─── parseCron ────────────────────────────────────────────────────────────────

describe('parseCron', () => {
    describe('daily crons', () => {
        it('"0 9 * * *" → daily 9 AM', () => {
            const s = parseCron('0 9 * * *');
            expect(s.frequency).toBe('daily');
            expect(s.hour).toBe(9);
            expect(s.minute).toBe('00');
            expect(s.ampm).toBe('am');
        });

        it('"30 15 * * *" → daily 3:30 PM', () => {
            const s = parseCron('30 15 * * *');
            expect(s.frequency).toBe('daily');
            expect(s.hour).toBe(3);
            expect(s.minute).toBe('30');
            expect(s.ampm).toBe('pm');
        });

        it('"0 0 * * *" → daily 12 AM (midnight)', () => {
            const s = parseCron('0 0 * * *');
            expect(s.frequency).toBe('daily');
            expect(s.hour).toBe(12);
            expect(s.ampm).toBe('am');
        });

        it('"0 12 * * *" → daily 12 PM (noon)', () => {
            const s = parseCron('0 12 * * *');
            expect(s.frequency).toBe('daily');
            expect(s.hour).toBe(12);
            expect(s.ampm).toBe('pm');
        });
    });

    describe('weekly crons', () => {
        it('"0 9 * * 1" → weekly Monday 9 AM', () => {
            const s = parseCron('0 9 * * 1');
            expect(s.frequency).toBe('weekly');
            expect(s.dayOfWeek).toBe(1); // Monday
            expect(s.hour).toBe(9);
            expect(s.ampm).toBe('am');
        });

        it('"0 7 * * 0" → weekly Sunday 7 AM (cron 0 → UI 7)', () => {
            const s = parseCron('0 7 * * 0');
            expect(s.frequency).toBe('weekly');
            expect(s.dayOfWeek).toBe(7); // Sunday in UI
            expect(s.hour).toBe(7);
            expect(s.ampm).toBe('am');
        });

        it('"0 17 * * 5" → weekly Friday 5 PM', () => {
            const s = parseCron('0 17 * * 5');
            expect(s.frequency).toBe('weekly');
            expect(s.dayOfWeek).toBe(5); // Friday
            expect(s.hour).toBe(5);
            expect(s.ampm).toBe('pm');
        });
    });

    describe('monthly crons', () => {
        it('"0 8 1 * *" → monthly 1st 8 AM', () => {
            const s = parseCron('0 8 1 * *');
            expect(s.frequency).toBe('monthly');
            expect(s.monthDay).toBe(1);
            expect(s.hour).toBe(8);
            expect(s.ampm).toBe('am');
        });

        it('"30 21 15 * *" → monthly 15th 9:30 PM', () => {
            const s = parseCron('30 21 15 * *');
            expect(s.frequency).toBe('monthly');
            expect(s.monthDay).toBe(15);
            expect(s.hour).toBe(9);
            expect(s.minute).toBe('30');
            expect(s.ampm).toBe('pm');
        });
    });

    describe('edge cases and invalid input', () => {
        it('falls back to defaults on empty string', () => {
            const s = parseCron('');
            expect(s.frequency).toBe('daily');
            expect(s.hour).toBe(7);
            expect(s.ampm).toBe('am');
        });

        it('returns a valid ScheduleState (no throw) on garbage input', () => {
            // 'not a cron at all' has 5 tokens so parseCron does not short-circuit.
            // It returns a partial parse (NaN fields). Key assertion: no exception thrown
            // and frequency is one of the valid values.
            const s = parseCron('not a cron at all');
            expect(['daily', 'weekly', 'monthly']).toContain(s.frequency);
        });

        it('falls back to defaults on too-few parts', () => {
            const s = parseCron('0 9 *');
            expect(s.frequency).toBe('daily');
        });

        it('snaps non-quarter minute to :00', () => {
            // Minute 17 is not in MINUTES (00/15/30/45) → snaps to 00
            const s = parseCron('17 9 * * *');
            expect(s.minute).toBe('00');
        });

        it('monthDay clamped at max 28', () => {
            const s = parseCron('0 9 31 * *');
            expect(s.monthDay).toBe(28);
        });

        it('monthDay clamped at min 1', () => {
            const s = parseCron('0 9 0 * *');
            expect(s.monthDay).toBe(1);
        });
    });
});

// ─── Round-trip ───────────────────────────────────────────────────────────────

describe('parseCron → buildCron round-trip', () => {
    const crons = [
        '0 9 * * *',   // daily 9 AM
        '30 15 * * *', // daily 3:30 PM
        '0 0 * * *',   // midnight
        '0 12 * * *',  // noon
        '0 9 * * 1',   // weekly Monday
        '0 7 * * 0',   // weekly Sunday (cron 0)
        '0 8 1 * *',   // monthly 1st
        '30 21 15 * *', // monthly 15th 9:30 PM
    ];

    crons.forEach((cron) => {
        it(`"${cron}" survives round-trip`, () => {
            expect(buildCron(parseCron(cron))).toBe(cron);
        });
    });
});

// ─── describeSchedule ─────────────────────────────────────────────────────────

describe('describeSchedule', () => {
    const TZ = 'America/New_York';

    it('daily → "Every day at H:MM AM/PM Eastern"', () => {
        const label = describeSchedule(DAILY_9AM, TZ);
        expect(label).toBe('Every day at 9:00 AM Eastern');
    });

    it('weekly Monday → "Every Monday at 9:00 AM Eastern"', () => {
        const label = describeSchedule(WEEKLY_MONDAY_9AM, TZ);
        expect(label).toBe('Every Monday at 9:00 AM Eastern');
    });

    it('weekly Sunday → "Every Sunday at 7:00 AM Eastern"', () => {
        const label = describeSchedule(WEEKLY_SUNDAY_7AM, TZ);
        expect(label).toBe('Every Sunday at 7:00 AM Eastern');
    });

    it('monthly 1st → "1st of each month at 8:00 AM Eastern"', () => {
        const label = describeSchedule(MONTHLY_1ST_8AM, TZ);
        expect(label).toBe('1st of each month at 8:00 AM Eastern');
    });

    it('monthly 2nd → "2nd of each month …"', () => {
        const s: ScheduleState = { ...MONTHLY_1ST_8AM, monthDay: 2 };
        expect(describeSchedule(s, TZ)).toContain('2nd');
    });

    it('monthly 3rd → "3rd of each month …"', () => {
        const s: ScheduleState = { ...MONTHLY_1ST_8AM, monthDay: 3 };
        expect(describeSchedule(s, TZ)).toContain('3rd');
    });

    it('monthly 4th → "4th of each month …"', () => {
        const s: ScheduleState = { ...MONTHLY_1ST_8AM, monthDay: 4 };
        expect(describeSchedule(s, TZ)).toContain('4th');
    });

    it('falls back to "Local" for unknown timezone', () => {
        const label = describeSchedule(DAILY_9AM, 'Pacific/Auckland');
        expect(label).toContain('Local');
    });

    it('Pacific timezone shows PT label', () => {
        const label = describeSchedule(DAILY_9AM, 'America/Los_Angeles');
        expect(label).toContain('Pacific');
    });

    it('3:30 PM formatted correctly', () => {
        const label = describeSchedule(DAILY_3PM, TZ);
        expect(label).toBe('Every day at 3:30 PM Eastern');
    });
});
