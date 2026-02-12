/**
 * Unit tests for Campaign Management Types & Constants
 */
import {
    CAMPAIGN_GOALS,
    CAMPAIGN_STATUS_INFO,
    CAMPAIGN_VARIABLES,
    createDefaultPerformance,
} from '../campaign';
import type { CampaignStatus } from '../campaign';

describe('Campaign Types', () => {
    describe('CAMPAIGN_GOALS', () => {
        it('should have exactly 10 goals', () => {
            expect(CAMPAIGN_GOALS).toHaveLength(10);
        });

        it('each goal should have id, label, description, icon, suggestedSegments, suggestedChannels', () => {
            for (const goal of CAMPAIGN_GOALS) {
                expect(goal.id).toBeDefined();
                expect(typeof goal.id).toBe('string');

                expect(goal.label).toBeDefined();
                expect(typeof goal.label).toBe('string');
                expect(goal.label.length).toBeGreaterThan(0);

                expect(goal.description).toBeDefined();
                expect(typeof goal.description).toBe('string');
                expect(goal.description.length).toBeGreaterThan(0);

                expect(goal.icon).toBeDefined();
                expect(typeof goal.icon).toBe('string');
                expect(goal.icon.length).toBeGreaterThan(0);

                expect(Array.isArray(goal.suggestedSegments)).toBe(true);
                expect(goal.suggestedSegments.length).toBeGreaterThan(0);

                expect(Array.isArray(goal.suggestedChannels)).toBe(true);
                expect(goal.suggestedChannels.length).toBeGreaterThan(0);
            }
        });

        it('each goal ID should be unique', () => {
            const ids = CAMPAIGN_GOALS.map(g => g.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
    });

    describe('CAMPAIGN_STATUS_INFO', () => {
        const ALL_STATUSES: CampaignStatus[] = [
            'draft',
            'compliance_review',
            'pending_approval',
            'approved',
            'scheduled',
            'sending',
            'sent',
            'paused',
            'cancelled',
            'failed',
        ];

        it('should have entries for all 10 statuses', () => {
            expect(Object.keys(CAMPAIGN_STATUS_INFO)).toHaveLength(10);
        });

        it('should have an entry for every CampaignStatus value', () => {
            for (const status of ALL_STATUSES) {
                expect(CAMPAIGN_STATUS_INFO[status]).toBeDefined();
            }
        });

        it('each status entry should have label, color, description', () => {
            for (const status of ALL_STATUSES) {
                const info = CAMPAIGN_STATUS_INFO[status];

                expect(info.label).toBeDefined();
                expect(typeof info.label).toBe('string');
                expect(info.label.length).toBeGreaterThan(0);

                expect(info.color).toBeDefined();
                expect(typeof info.color).toBe('string');
                expect(info.color.length).toBeGreaterThan(0);

                expect(info.description).toBeDefined();
                expect(typeof info.description).toBe('string');
                expect(info.description.length).toBeGreaterThan(0);
            }
        });

        it('each status label should be a non-empty string', () => {
            for (const key of Object.keys(CAMPAIGN_STATUS_INFO)) {
                const info = CAMPAIGN_STATUS_INFO[key as CampaignStatus];
                expect(typeof info.label).toBe('string');
                expect(info.label.trim().length).toBeGreaterThan(0);
            }
        });
    });

    describe('createDefaultPerformance', () => {
        it('should return an object with all numeric fields set to zero', () => {
            const perf = createDefaultPerformance();

            expect(perf.totalRecipients).toBe(0);
            expect(perf.sent).toBe(0);
            expect(perf.delivered).toBe(0);
            expect(perf.opened).toBe(0);
            expect(perf.clicked).toBe(0);
            expect(perf.bounced).toBe(0);
            expect(perf.unsubscribed).toBe(0);
            expect(perf.revenue).toBe(0);
            expect(perf.openRate).toBe(0);
            expect(perf.clickRate).toBe(0);
            expect(perf.bounceRate).toBe(0);
            expect(perf.conversionRate).toBe(0);
        });

        it('should return a valid Date for lastUpdated', () => {
            const before = new Date();
            const perf = createDefaultPerformance();
            const after = new Date();

            expect(perf.lastUpdated).toBeInstanceOf(Date);
            expect(perf.lastUpdated.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(perf.lastUpdated.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should return a new object on each call', () => {
            const a = createDefaultPerformance();
            const b = createDefaultPerformance();
            expect(a).not.toBe(b);
        });
    });

    describe('CAMPAIGN_VARIABLES', () => {
        it('should have exactly 8 variables', () => {
            expect(CAMPAIGN_VARIABLES).toHaveLength(8);
        });

        it('each variable should have key, label, example', () => {
            for (const variable of CAMPAIGN_VARIABLES) {
                expect(variable.key).toBeDefined();
                expect(typeof variable.key).toBe('string');
                expect(variable.key.length).toBeGreaterThan(0);

                expect(variable.label).toBeDefined();
                expect(typeof variable.label).toBe('string');
                expect(variable.label.length).toBeGreaterThan(0);

                expect(variable.example).toBeDefined();
                expect(typeof variable.example).toBe('string');
                expect(variable.example.length).toBeGreaterThan(0);
            }
        });

        it('each variable key should use double-curly-brace syntax', () => {
            for (const variable of CAMPAIGN_VARIABLES) {
                expect(variable.key).toMatch(/^\{\{.+\}\}$/);
            }
        });
    });
});
