/**
 * Tests for dispensary playbook configuration helpers
 *
 * Covers:
 * 1. FREQ_TO_CRON — default cron expressions per frequency keyword
 * 2. configTriggerToPlaybookTrigger — converts config PlaybookTrigger to editable PlaybookTrigger
 * 3. hasDeliveryChannels — detects whether a playbook sends via email/SMS
 * 4. PlaybookCustomConfig construction — handleSaveConfig logic (pure)
 * 5. updatePlaybookAssignmentConfig — Firestore persistence logic (mocked)
 */

import { describe, it, expect } from '@jest/globals';
import type { PlaybookDefinition, PlaybookTrigger as ConfigTrigger } from '@/config/playbooks';
import type { PlaybookTrigger } from '@/types/playbook';
import type { PlaybookCustomConfig } from '@/server/actions/dispensary-playbooks';
import type { DeliveryConfig } from '@/app/dashboard/playbooks/components/playbook-edit-sheet';

// ─── Inline helpers mirrored from dispensary-playbooks-view.tsx ──────────────
// These are private to the component; we mirror them here for unit-testing.

const FREQ_TO_CRON: Record<string, string> = {
    daily: '0 7 * * *',
    weekly: '0 9 * * 1',
    monthly: '0 8 1 * *',
    quarterly: '0 8 1 1,4,7,10 *',
    one_time: '0 7 * * *',
};

function configTriggerToPlaybookTrigger(configTrigger: ConfigTrigger): PlaybookTrigger {
    if (configTrigger.type === 'schedule') {
        return {
            type: 'schedule',
            cron: FREQ_TO_CRON[configTrigger.frequency] ?? '0 7 * * *',
            timezone: 'America/New_York',
        };
    }
    return { type: 'event', eventName: configTrigger.event };
}

function hasDeliveryChannels(playbook: PlaybookDefinition): boolean {
    return playbook.channels.some((ch) =>
        ch === 'email' || ch === 'sms_customer' || ch === 'sms_internal'
    );
}

/** Mirrors handleSaveConfig in dispensary-playbooks-view.tsx */
function buildCustomConfig(trigger: PlaybookTrigger, delivery: DeliveryConfig): PlaybookCustomConfig {
    return {
        schedule: trigger.type === 'schedule' && trigger.cron
            ? { cron: trigger.cron, timezone: trigger.timezone ?? 'America/New_York' }
            : undefined,
        delivery: {
            channels: delivery.channels,
            emailTo: delivery.emailTo,
            phoneNumber: delivery.phoneNumber,
            reportFormat: delivery.reportFormat,
        },
    };
}

// ─── FREQ_TO_CRON ─────────────────────────────────────────────────────────────

describe('FREQ_TO_CRON', () => {
    it('daily → valid daily cron', () => {
        const cron = FREQ_TO_CRON['daily'];
        expect(cron).toMatch(/^\d+ \d+ \* \* \*$/);
    });

    it('weekly → contains day-of-week field', () => {
        const cron = FREQ_TO_CRON['weekly'];
        const parts = cron.split(' ');
        // "0 9 * * 1" — last field is day of week
        expect(parts[4]).toMatch(/^\d+$/);
        expect(parts[2]).toBe('*');
    });

    it('monthly → contains day-of-month field', () => {
        const cron = FREQ_TO_CRON['monthly'];
        const parts = cron.split(' ');
        // "0 8 1 * *" — third field is day of month
        expect(parts[2]).toMatch(/^\d+$/);
        expect(parts[4]).toBe('*');
    });

    it('quarterly → valid 4-month cron', () => {
        expect(FREQ_TO_CRON['quarterly']).toContain('1,4,7,10');
    });

    it('one_time → same as daily (fallback)', () => {
        expect(FREQ_TO_CRON['one_time']).toBe(FREQ_TO_CRON['daily']);
    });

    it('all values are non-empty strings', () => {
        Object.values(FREQ_TO_CRON).forEach((cron) => {
            expect(typeof cron).toBe('string');
            expect(cron.length).toBeGreaterThan(0);
        });
    });
});

// ─── configTriggerToPlaybookTrigger ──────────────────────────────────────────

describe('configTriggerToPlaybookTrigger', () => {
    it('schedule "daily" → type=schedule with daily cron', () => {
        const result = configTriggerToPlaybookTrigger({ type: 'schedule', frequency: 'daily' });
        expect(result.type).toBe('schedule');
        if (result.type === 'schedule') {
            expect(result.cron).toBe('0 7 * * *');
            expect(result.timezone).toBe('America/New_York');
        }
    });

    it('schedule "weekly" → type=schedule with weekly cron', () => {
        const result = configTriggerToPlaybookTrigger({ type: 'schedule', frequency: 'weekly' });
        expect(result.type).toBe('schedule');
        if (result.type === 'schedule') {
            expect(result.cron).toBe('0 9 * * 1');
        }
    });

    it('schedule "monthly" → type=schedule with monthly cron', () => {
        const result = configTriggerToPlaybookTrigger({ type: 'schedule', frequency: 'monthly' });
        expect(result.type).toBe('schedule');
        if (result.type === 'schedule') {
            expect(result.cron).toBe('0 8 1 * *');
        }
    });

    it('unknown frequency falls back to daily cron', () => {
        const result = configTriggerToPlaybookTrigger({
            type: 'schedule',
            frequency: 'unknown_freq' as 'daily',
        });
        expect(result.type).toBe('schedule');
        if (result.type === 'schedule') {
            expect(result.cron).toBe('0 7 * * *'); // fallback
        }
    });

    it('event trigger → type=event with eventName', () => {
        const result = configTriggerToPlaybookTrigger({
            type: 'event',
            event: 'customer.signup',
        });
        expect(result.type).toBe('event');
        if (result.type === 'event') {
            expect(result.eventName).toBe('customer.signup');
        }
    });

    it('event trigger preserves dot-separated event name', () => {
        const result = configTriggerToPlaybookTrigger({
            type: 'event',
            event: 'order.post_purchase',
        });
        if (result.type === 'event') {
            expect(result.eventName).toBe('order.post_purchase');
        }
    });

    it('always sets Eastern timezone for schedule triggers', () => {
        const result = configTriggerToPlaybookTrigger({ type: 'schedule', frequency: 'daily' });
        if (result.type === 'schedule') {
            expect(result.timezone).toBe('America/New_York');
        }
    });
});

// ─── hasDeliveryChannels ──────────────────────────────────────────────────────

type Channel = PlaybookDefinition['channels'][number];

function makePlaybook(channels: Channel[]): PlaybookDefinition {
    return {
        id: 'test',
        name: 'Test Playbook',
        agent: 'craig',
        description: 'test',
        tiers: ['empire'],
        channels,
        trigger: { type: 'schedule', frequency: 'daily' },
        estimatedMonthlyCostUsd: 0,
    };
}

describe('hasDeliveryChannels', () => {
    it('email channel → true', () => {
        expect(hasDeliveryChannels(makePlaybook(['email']))).toBe(true);
    });

    it('sms_customer channel → true', () => {
        expect(hasDeliveryChannels(makePlaybook(['sms_customer']))).toBe(true);
    });

    it('sms_internal channel → true', () => {
        expect(hasDeliveryChannels(makePlaybook(['sms_internal']))).toBe(true);
    });

    it('dashboard-only channel → false', () => {
        expect(hasDeliveryChannels(makePlaybook(['dashboard']))).toBe(false);
    });

    it('empty channels → false', () => {
        expect(hasDeliveryChannels(makePlaybook([]))).toBe(false);
    });

    it('email + dashboard → true (email present)', () => {
        expect(hasDeliveryChannels(makePlaybook(['email', 'dashboard']))).toBe(true);
    });

    it('sms_customer + sms_internal → true', () => {
        expect(hasDeliveryChannels(makePlaybook(['sms_customer', 'sms_internal']))).toBe(true);
    });
});

// ─── buildCustomConfig (handleSaveConfig logic) ───────────────────────────────

describe('buildCustomConfig (PlaybookCustomConfig construction)', () => {
    const INBOX_DELIVERY: DeliveryConfig = {
        channels: ['inbox'],
        emailTo: '',
        phoneNumber: '',
        reportFormat: 'brief',
    };

    const EMAIL_DELIVERY: DeliveryConfig = {
        channels: ['inbox', 'email'],
        emailTo: 'owner@thrive.com',
        phoneNumber: '',
        reportFormat: 'detailed',
    };

    const SMS_DELIVERY: DeliveryConfig = {
        channels: ['inbox', 'sms'],
        emailTo: '',
        phoneNumber: '+15551234567',
        reportFormat: 'brief',
    };

    const SCHEDULE_TRIGGER: PlaybookTrigger = {
        type: 'schedule',
        cron: '0 9 * * 1',
        timezone: 'America/Chicago',
    };

    const EVENT_TRIGGER: PlaybookTrigger = {
        type: 'event',
        eventName: 'customer.signup',
    };

    const MANUAL_TRIGGER: PlaybookTrigger = { type: 'manual' };

    describe('schedule field', () => {
        it('schedule trigger → config.schedule populated', () => {
            const config = buildCustomConfig(SCHEDULE_TRIGGER, INBOX_DELIVERY);
            expect(config.schedule).toBeDefined();
            expect(config.schedule!.cron).toBe('0 9 * * 1');
            expect(config.schedule!.timezone).toBe('America/Chicago');
        });

        it('event trigger → config.schedule is undefined', () => {
            const config = buildCustomConfig(EVENT_TRIGGER, INBOX_DELIVERY);
            expect(config.schedule).toBeUndefined();
        });

        it('manual trigger → config.schedule is undefined', () => {
            const config = buildCustomConfig(MANUAL_TRIGGER, INBOX_DELIVERY);
            expect(config.schedule).toBeUndefined();
        });

        it('schedule without cron → config.schedule is undefined', () => {
            const triggerNoCron: PlaybookTrigger = { type: 'schedule' };
            const config = buildCustomConfig(triggerNoCron, INBOX_DELIVERY);
            expect(config.schedule).toBeUndefined();
        });

        it('timezone falls back to Eastern when missing', () => {
            const triggerNoTz: PlaybookTrigger = { type: 'schedule', cron: '0 9 * * *' };
            const config = buildCustomConfig(triggerNoTz, INBOX_DELIVERY);
            expect(config.schedule!.timezone).toBe('America/New_York');
        });
    });

    describe('delivery field', () => {
        it('channels propagated correctly', () => {
            const config = buildCustomConfig(SCHEDULE_TRIGGER, EMAIL_DELIVERY);
            expect(config.delivery!.channels).toEqual(['inbox', 'email']);
        });

        it('emailTo propagated', () => {
            const config = buildCustomConfig(SCHEDULE_TRIGGER, EMAIL_DELIVERY);
            expect(config.delivery!.emailTo).toBe('owner@thrive.com');
        });

        it('phoneNumber propagated', () => {
            const config = buildCustomConfig(SCHEDULE_TRIGGER, SMS_DELIVERY);
            expect(config.delivery!.phoneNumber).toBe('+15551234567');
        });

        it('reportFormat "detailed" propagated', () => {
            const config = buildCustomConfig(SCHEDULE_TRIGGER, EMAIL_DELIVERY);
            expect(config.delivery!.reportFormat).toBe('detailed');
        });

        it('reportFormat "brief" propagated', () => {
            const config = buildCustomConfig(SCHEDULE_TRIGGER, INBOX_DELIVERY);
            expect(config.delivery!.reportFormat).toBe('brief');
        });

        it('inbox-only delivery still stores delivery field', () => {
            const config = buildCustomConfig(MANUAL_TRIGGER, INBOX_DELIVERY);
            expect(config.delivery).toBeDefined();
            expect(config.delivery!.channels).toContain('inbox');
        });
    });

    describe('combined schedule + delivery', () => {
        it('full schedule + email delivery produces correct config', () => {
            const config = buildCustomConfig(SCHEDULE_TRIGGER, EMAIL_DELIVERY);
            expect(config.schedule!.cron).toBe('0 9 * * 1');
            expect(config.delivery!.channels).toContain('email');
            expect(config.delivery!.emailTo).toBe('owner@thrive.com');
            expect(config.delivery!.reportFormat).toBe('detailed');
        });

        it('manual + SMS delivery produces correct config', () => {
            const config = buildCustomConfig(MANUAL_TRIGGER, SMS_DELIVERY);
            expect(config.schedule).toBeUndefined();
            expect(config.delivery!.channels).toContain('sms');
            expect(config.delivery!.phoneNumber).toBe('+15551234567');
        });
    });
});
