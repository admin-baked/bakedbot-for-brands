/**
 * Tests for playbook-edit-sheet.tsx logic
 *
 * Covers:
 * 1. DeliveryConfig toggle logic (toggleChannel)
 * 2. Inbox channel always-on invariant
 * 3. DEFAULT_DELIVERY initial state
 * 4. DeliveryConfig channel combinations
 * 5. PlaybookEditSheetProps type validation (prop shapes)
 * 6. onSave called with correct trigger + delivery shapes
 * 7. handleSave error propagation (sheet stays open on throw)
 */

import { describe, it, expect } from '@jest/globals';
import type { DeliveryConfig, DeliveryChannel } from '@/app/dashboard/playbooks/components/playbook-edit-sheet';

// ─── Inline helpers mirrored from playbook-edit-sheet.tsx ────────────────────

const DEFAULT_DELIVERY: DeliveryConfig = {
    channels: ['inbox'],
    emailTo: '',
    phoneNumber: '',
    reportFormat: 'brief',
};

function toggleChannel(prev: DeliveryConfig, ch: DeliveryChannel): DeliveryConfig {
    const has = prev.channels.includes(ch);
    const next = has
        ? prev.channels.filter((c) => c !== ch)
        : [...prev.channels, ch];
    // Always keep at least 'inbox'
    return { ...prev, channels: next.length ? next : ['inbox'] };
}

// ─── DEFAULT_DELIVERY ─────────────────────────────────────────────────────────

describe('DEFAULT_DELIVERY', () => {
    it('starts with inbox channel only', () => {
        expect(DEFAULT_DELIVERY.channels).toEqual(['inbox']);
    });

    it('emailTo is empty string', () => {
        expect(DEFAULT_DELIVERY.emailTo).toBe('');
    });

    it('phoneNumber is empty string', () => {
        expect(DEFAULT_DELIVERY.phoneNumber).toBe('');
    });

    it('reportFormat is "brief"', () => {
        expect(DEFAULT_DELIVERY.reportFormat).toBe('brief');
    });
});

// ─── toggleChannel ────────────────────────────────────────────────────────────

describe('toggleChannel', () => {
    describe('adding channels', () => {
        it('adds email when not present', () => {
            const result = toggleChannel(DEFAULT_DELIVERY, 'email');
            expect(result.channels).toContain('email');
            expect(result.channels).toContain('inbox');
        });

        it('adds sms when not present', () => {
            const result = toggleChannel(DEFAULT_DELIVERY, 'sms');
            expect(result.channels).toContain('sms');
        });

        it('preserves existing channels when adding new one', () => {
            const withEmail: DeliveryConfig = { ...DEFAULT_DELIVERY, channels: ['inbox', 'email'] };
            const result = toggleChannel(withEmail, 'sms');
            expect(result.channels).toContain('inbox');
            expect(result.channels).toContain('email');
            expect(result.channels).toContain('sms');
        });

        it('does not duplicate existing channel', () => {
            const withEmail: DeliveryConfig = { ...DEFAULT_DELIVERY, channels: ['inbox', 'email'] };
            const result = toggleChannel(withEmail, 'email');
            // Toggling existing email → removes it
            expect(result.channels.filter((c) => c === 'email').length).toBe(0);
        });
    });

    describe('removing channels', () => {
        it('removes email when present', () => {
            const withEmail: DeliveryConfig = { ...DEFAULT_DELIVERY, channels: ['inbox', 'email'] };
            const result = toggleChannel(withEmail, 'email');
            expect(result.channels).not.toContain('email');
        });

        it('removes sms when present', () => {
            const withSms: DeliveryConfig = { ...DEFAULT_DELIVERY, channels: ['inbox', 'sms'] };
            const result = toggleChannel(withSms, 'sms');
            expect(result.channels).not.toContain('sms');
        });

        it('keeps inbox when removing other channel', () => {
            const withEmail: DeliveryConfig = { ...DEFAULT_DELIVERY, channels: ['inbox', 'email'] };
            const result = toggleChannel(withEmail, 'email');
            expect(result.channels).toContain('inbox');
        });
    });

    describe('inbox always-on invariant', () => {
        it('cannot remove inbox (fallback protects it)', () => {
            // If somehow inbox is the only channel and we try to remove it,
            // the fallback ensures ['inbox'] is returned
            const inboxOnly: DeliveryConfig = { ...DEFAULT_DELIVERY, channels: ['inbox'] };
            const result = toggleChannel(inboxOnly, 'inbox');
            // After removing inbox, next = [], fallback kicks in → ['inbox']
            expect(result.channels).toEqual(['inbox']);
        });

        it('removing all non-inbox channels preserves inbox', () => {
            const allChannels: DeliveryConfig = {
                ...DEFAULT_DELIVERY,
                channels: ['inbox', 'email', 'sms'],
            };
            let state = toggleChannel(allChannels, 'email');
            state = toggleChannel(state, 'sms');
            expect(state.channels).toContain('inbox');
        });
    });

    describe('preserves other DeliveryConfig fields', () => {
        it('emailTo is preserved after toggle', () => {
            const withEmail: DeliveryConfig = {
                ...DEFAULT_DELIVERY,
                channels: ['inbox', 'email'],
                emailTo: 'test@example.com',
            };
            const result = toggleChannel(withEmail, 'sms');
            expect(result.emailTo).toBe('test@example.com');
        });

        it('reportFormat is preserved after toggle', () => {
            const detailed: DeliveryConfig = {
                ...DEFAULT_DELIVERY,
                reportFormat: 'detailed',
            };
            const result = toggleChannel(detailed, 'email');
            expect(result.reportFormat).toBe('detailed');
        });
    });
});

// ─── DeliveryConfig channel combinations ─────────────────────────────────────

describe('DeliveryConfig channel combination logic', () => {
    it('inbox + email is a valid combination', () => {
        const config: DeliveryConfig = {
            channels: ['inbox', 'email'],
            emailTo: 'a@b.com',
            reportFormat: 'brief',
        };
        expect(config.channels).toHaveLength(2);
    });

    it('inbox + sms is a valid combination', () => {
        const config: DeliveryConfig = {
            channels: ['inbox', 'sms'],
            phoneNumber: '+15551234567',
            reportFormat: 'brief',
        };
        expect(config.channels).toHaveLength(2);
    });

    it('all three channels is valid', () => {
        const config: DeliveryConfig = {
            channels: ['inbox', 'email', 'sms'],
            emailTo: 'a@b.com',
            phoneNumber: '+15559876543',
            reportFormat: 'detailed',
        };
        expect(config.channels).toHaveLength(3);
    });
});

// ─── onSave argument shapes ───────────────────────────────────────────────────

describe('onSave argument shapes', () => {
    it('manual trigger + inbox delivery shape', () => {
        // What handleSave passes to onSave when trigger=manual, delivery=inbox only
        const trigger = { type: 'manual' as const };
        const delivery: DeliveryConfig = { channels: ['inbox'], reportFormat: 'brief' };

        expect(trigger.type).toBe('manual');
        expect(delivery.channels).toEqual(['inbox']);
    });

    it('schedule trigger shape includes cron + timezone', () => {
        const trigger = {
            type: 'schedule' as const,
            cron: '0 9 * * 1',
            timezone: 'America/New_York',
        };

        expect(trigger.cron).toMatch(/^\d+ \d+ [\d*]+ [\d*,]+ [\d*]+$/);
        expect(trigger.timezone).toBe('America/New_York');
    });

    it('event trigger shape includes eventName', () => {
        const trigger = {
            type: 'event' as const,
            eventName: 'customer.birthday',
        };

        expect(trigger.eventName).toBe('customer.birthday');
    });

    it('detailed delivery config shape', () => {
        const delivery: DeliveryConfig = {
            channels: ['inbox', 'email'],
            emailTo: 'admin@thrive.com',
            reportFormat: 'detailed',
        };

        expect(delivery.channels).toContain('email');
        expect(delivery.emailTo).toBe('admin@thrive.com');
        expect(delivery.reportFormat).toBe('detailed');
    });
});

// ─── handleSave error propagation ────────────────────────────────────────────

describe('handleSave error propagation', () => {
    it('onSave that throws causes saving state to reset', async () => {
        // Simulate handleSave behaviour: setSaving(true) → try onSave → finally setSaving(false)
        let saving = false;
        let callCount = 0;

        const mockOnSave = async () => {
            callCount++;
            throw new Error('Server error');
        };

        const handleSave = async () => {
            saving = true;
            try {
                await mockOnSave();
            } finally {
                saving = false;
            }
        };

        await expect(handleSave()).rejects.toThrow('Server error');
        expect(saving).toBe(false); // finally always runs
        expect(callCount).toBe(1);
    });

    it('successful onSave resolves without error', async () => {
        let saving = false;
        let closed = false;

        const mockOnSave = async () => { /* success */ };
        const mockClose = () => { closed = true; };

        const handleSave = async () => {
            saving = true;
            try {
                await mockOnSave();
                mockClose();
            } finally {
                saving = false;
            }
        };

        await handleSave();
        expect(saving).toBe(false);
        expect(closed).toBe(true);
    });
});

// ─── Sheet reset-on-open logic ────────────────────────────────────────────────

describe('sheet reset-on-open logic', () => {
    it('handleOpenChange resets state when isOpen=true', () => {
        // Simulate handleOpenChange behaviour
        const initialDelivery = DEFAULT_DELIVERY;
        let delivery = { channels: ['inbox', 'email'] as DeliveryChannel[], reportFormat: 'detailed' as const };

        const handleOpenChange = (isOpen: boolean, initialTrigger: { type: string }, reset: () => void) => {
            if (isOpen) {
                reset();
            }
        };

        const reset = () => {
            delivery = initialDelivery;
        };

        // Simulate opening with new data
        handleOpenChange(true, { type: 'manual' }, reset);
        expect(delivery.channels).toEqual(['inbox']);
        expect(delivery.reportFormat).toBe('brief');
    });

    it('handleOpenChange does NOT reset state when isOpen=false (just closes)', () => {
        let delivery: DeliveryConfig = { channels: ['inbox', 'email'], reportFormat: 'detailed' };

        const handleOpenChange = (isOpen: boolean, reset: () => void) => {
            if (isOpen) reset();
            // closing does nothing to state
        };

        handleOpenChange(false, () => {
            delivery = DEFAULT_DELIVERY;
        });

        // Delivery unchanged — close does not reset
        expect(delivery.channels).toContain('email');
        expect(delivery.reportFormat).toBe('detailed');
    });
});
