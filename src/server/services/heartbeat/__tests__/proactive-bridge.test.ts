jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import type { HeartbeatCheckResult } from '@/types/heartbeat';
import { getHeartbeatBridgeCandidate } from '@/server/services/heartbeat-proactive-bridge';

function makeResult(overrides: Partial<HeartbeatCheckResult>): HeartbeatCheckResult {
    return {
        checkId: 'birthday_upcoming',
        agent: 'mrs_parker',
        status: 'ok',
        priority: 'low',
        title: 'Default title',
        message: 'Default message',
        timestamp: new Date('2026-03-21T12:00:00.000Z'),
        ...overrides,
    };
}

describe('getHeartbeatBridgeCandidate', () => {
    const orgId = 'org_thrive_syracuse';
    const now = new Date('2026-03-21T12:00:00.000Z');

    it('maps upcoming birthdays into vip retention workflow', () => {
        const candidate = getHeartbeatBridgeCandidate(orgId, makeResult({
            checkId: 'birthday_upcoming',
            title: '4 Birthdays This Week',
            message: '4 customers have birthdays coming up.',
            data: {
                count: 4,
                birthdays: [
                    { name: 'A', daysAway: 1 },
                    { name: 'B', daysAway: 2 },
                ],
            },
        }), now);

        expect(candidate).toMatchObject({
            checkId: 'birthday_upcoming',
            workflowKey: 'vip_retention_watch',
            agentKey: 'mrs_parker',
            threadKey: 'heartbeat_customer_occasions',
            businessObjectId: 'birthdays_upcoming',
        });
        expect(candidate?.dedupeKey).toBe('heartbeat:birthday_upcoming:org_thrive_syracuse:2026-03-16');
    });

    it('maps new customer surge into daily health workflow', () => {
        const candidate = getHeartbeatBridgeCandidate(orgId, makeResult({
            checkId: 'new_customer_surge',
            agent: 'craig',
            priority: 'medium',
            title: 'New Customer Surge: 8 Today',
            message: '8 new customers in 24h vs 2.0/day average.',
            data: {
                todayCount: 8,
                weeklyAvg: 2,
                weekTotal: 14,
            },
        }), now);

        expect(candidate).toMatchObject({
            checkId: 'new_customer_surge',
            workflowKey: 'daily_dispensary_health',
            agentKey: 'craig',
            threadKey: 'heartbeat_customer_growth',
            businessObjectId: 'new_customer_surge',
            severity: 'high',
        });
        expect(candidate?.dedupeKey).toBe('heartbeat:new_customer_surge:org_thrive_syracuse:2026-03-21');
    });

    it('returns null for unsupported heartbeat checks', () => {
        const candidate = getHeartbeatBridgeCandidate(orgId, makeResult({
            checkId: 'low_stock_alerts',
            agent: 'smokey',
            status: 'warning',
            priority: 'high',
        }), now);

        expect(candidate).toBeNull();
    });

    it('returns null when the heartbeat signal is not actionable', () => {
        const candidate = getHeartbeatBridgeCandidate(orgId, makeResult({
            checkId: 'birthday_upcoming',
            data: { count: 0, birthdays: [] },
        }), now);

        expect(candidate).toBeNull();
    });
});
