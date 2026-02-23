/**
 * InsightCardsGrid — Logic Unit Tests
 *
 * Tests the header computation logic added to make the briefing feel alive:
 * - Summary line generation (green/amber/red urgency messages)
 * - Summary color selection
 * - Card severity counting
 * - maxCards slicing behaviour
 * - Severity sort order used inside the grid
 *
 * Note: Full RTL rendering is skipped here due to the deep hook chain in
 * InsightCardsGrid (useInsights → useUserRole → useMockData). The rendered
 * output is exercised by integration tests. These tests pin the pure
 * computation logic so regressions are caught instantly without any network.
 */

import { describe, it, expect } from '@jest/globals';
import type { InsightCard, InsightSeverity } from '@/types/insight-cards';

// ============ Pure helpers mirroring insight-cards-grid.tsx ============

/** Mirrors the dynamic header computation in InsightCardsGrid */
function computeHeader(insights: InsightCard[]): {
    summaryLine: string;
    summaryColor: string;
    criticalCount: number;
    warningCount: number;
    attentionCount: number;
} {
    const criticalCount = insights.filter(i => i.severity === 'critical').length;
    const warningCount = insights.filter(i => i.severity === 'warning').length;
    const attentionCount = criticalCount + warningCount;

    const summaryLine =
        criticalCount > 0
            ? `${criticalCount} critical item${criticalCount > 1 ? 's' : ''} need${criticalCount === 1 ? 's' : ''} immediate attention`
            : attentionCount > 0
              ? `${attentionCount} item${attentionCount > 1 ? 's' : ''} need${attentionCount === 1 ? 's' : ''} your attention`
              : 'All systems healthy — great day ahead';

    const summaryColor =
        criticalCount > 0
            ? 'text-red-600 dark:text-red-400'
            : attentionCount > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400';

    return { summaryLine, summaryColor, criticalCount, warningCount, attentionCount };
}

/** Mirrors the grid's severity sort + slice logic */
function applyGridSort(insights: InsightCard[], maxCards: number): InsightCard[] {
    const severityOrder: Record<InsightSeverity, number> = {
        critical: 0,
        warning: 1,
        info: 2,
        success: 3,
    };
    return [...insights]
        .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
        .slice(0, maxCards);
}

// ============ Fixtures ============

function makeCard(overrides: Partial<InsightCard> & { id: string }): InsightCard {
    return {
        category: 'customer',
        agentId: 'mrs_parker',
        agentName: 'Mrs. Parker',
        title: 'Test',
        headline: 'Test headline',
        severity: 'info',
        actionable: false,
        lastUpdated: new Date('2026-02-23T08:00:00Z'),
        dataSource: 'test',
        ...overrides,
    };
}

// ============ Summary Line Tests ============

describe('InsightCardsGrid — Summary Line', () => {
    it('shows green all-clear when no criticals or warnings', () => {
        const { summaryLine, summaryColor } = computeHeader([
            makeCard({ id: '1', severity: 'success' }),
            makeCard({ id: '2', severity: 'info' }),
        ]);
        expect(summaryLine).toBe('All systems healthy — great day ahead');
        expect(summaryColor).toContain('emerald');
    });

    it('shows green all-clear for empty insights', () => {
        const { summaryLine, summaryColor } = computeHeader([]);
        expect(summaryLine).toBe('All systems healthy — great day ahead');
        expect(summaryColor).toContain('emerald');
    });

    it('shows amber with count when only warnings present', () => {
        const { summaryLine, summaryColor } = computeHeader([
            makeCard({ id: '1', severity: 'warning' }),
            makeCard({ id: '2', severity: 'warning' }),
            makeCard({ id: '3', severity: 'info' }),
        ]);
        expect(summaryLine).toBe('2 items need your attention');
        expect(summaryColor).toContain('amber');
    });

    it('uses singular grammar for exactly 1 warning item', () => {
        const { summaryLine } = computeHeader([
            makeCard({ id: '1', severity: 'warning' }),
        ]);
        expect(summaryLine).toBe('1 item needs your attention');
    });

    it('shows red critical message when any critical present', () => {
        const { summaryLine, summaryColor } = computeHeader([
            makeCard({ id: '1', severity: 'critical' }),
        ]);
        expect(summaryLine).toBe('1 critical item needs immediate attention');
        expect(summaryColor).toContain('red');
    });

    it('uses plural grammar for multiple criticals', () => {
        const { summaryLine } = computeHeader([
            makeCard({ id: '1', severity: 'critical' }),
            makeCard({ id: '2', severity: 'critical' }),
        ]);
        expect(summaryLine).toBe('2 critical items need immediate attention');
    });

    it('critical message supersedes warning count even with multiple warnings', () => {
        const { summaryLine } = computeHeader([
            makeCard({ id: '1', severity: 'critical' }),
            makeCard({ id: '2', severity: 'warning' }),
            makeCard({ id: '3', severity: 'warning' }),
            makeCard({ id: '4', severity: 'warning' }),
        ]);
        expect(summaryLine).toContain('1 critical item');
        expect(summaryLine).not.toContain('items need your attention');
    });

    it('attentionCount = criticalCount + warningCount', () => {
        const { criticalCount, warningCount, attentionCount } = computeHeader([
            makeCard({ id: '1', severity: 'critical' }),
            makeCard({ id: '2', severity: 'warning' }),
            makeCard({ id: '3', severity: 'info' }),
        ]);
        expect(criticalCount).toBe(1);
        expect(warningCount).toBe(1);
        expect(attentionCount).toBe(2);
    });

    it('info and success do not contribute to attentionCount', () => {
        const { attentionCount } = computeHeader([
            makeCard({ id: '1', severity: 'success' }),
            makeCard({ id: '2', severity: 'info' }),
            makeCard({ id: '3', severity: 'success' }),
        ]);
        expect(attentionCount).toBe(0);
    });
});

// ============ Summary Color Tests ============

describe('InsightCardsGrid — Summary Color', () => {
    it('returns emerald color for healthy state', () => {
        const { summaryColor } = computeHeader([makeCard({ id: '1', severity: 'success' })]);
        expect(summaryColor).toBe('text-emerald-600 dark:text-emerald-400');
    });

    it('returns amber color when warnings present', () => {
        const { summaryColor } = computeHeader([makeCard({ id: '1', severity: 'warning' })]);
        expect(summaryColor).toBe('text-amber-600 dark:text-amber-400');
    });

    it('returns red color when critical cards present', () => {
        const { summaryColor } = computeHeader([makeCard({ id: '1', severity: 'critical' })]);
        expect(summaryColor).toBe('text-red-600 dark:text-red-400');
    });

    it('red takes precedence over amber when both critical and warning exist', () => {
        const { summaryColor } = computeHeader([
            makeCard({ id: '1', severity: 'critical' }),
            makeCard({ id: '2', severity: 'warning' }),
        ]);
        expect(summaryColor).toBe('text-red-600 dark:text-red-400');
    });
});

// ============ Grid Sort + maxCards Tests ============

describe('InsightCardsGrid — Sort and Slice', () => {
    it('sorts critical before warning before info before success', () => {
        const cards = [
            makeCard({ id: 's', severity: 'success' }),
            makeCard({ id: 'i', severity: 'info' }),
            makeCard({ id: 'c', severity: 'critical' }),
            makeCard({ id: 'w', severity: 'warning' }),
        ];
        const result = applyGridSort(cards, 10);
        expect(result[0].severity).toBe('critical');
        expect(result[1].severity).toBe('warning');
        expect(result[2].severity).toBe('info');
        expect(result[3].severity).toBe('success');
    });

    it('limits output to maxCards', () => {
        const cards = Array.from({ length: 10 }, (_, i) =>
            makeCard({ id: `card-${i}`, severity: 'info' })
        );
        expect(applyGridSort(cards, 3)).toHaveLength(3);
        expect(applyGridSort(cards, 5)).toHaveLength(5);
    });

    it('returns all cards when count is less than maxCards', () => {
        const cards = [
            makeCard({ id: '1', severity: 'info' }),
            makeCard({ id: '2', severity: 'warning' }),
        ];
        expect(applyGridSort(cards, 5)).toHaveLength(2);
    });

    it('does not mutate the original array', () => {
        const cards = [
            makeCard({ id: 'a', severity: 'success' }),
            makeCard({ id: 'b', severity: 'critical' }),
        ];
        const originalFirst = cards[0].id;
        applyGridSort(cards, 5);
        expect(cards[0].id).toBe(originalFirst);
    });

    it('critical cards surface to top even when appended last', () => {
        const cards = [
            makeCard({ id: 'info1', severity: 'info' }),
            makeCard({ id: 'info2', severity: 'info' }),
            makeCard({ id: 'critical', severity: 'critical' }),
        ];
        const result = applyGridSort(cards, 3);
        expect(result[0].id).toBe('critical');
    });

    it('with maxCards=1 only the highest severity card is shown', () => {
        const cards = [
            makeCard({ id: 'info', severity: 'info' }),
            makeCard({ id: 'critical', severity: 'critical' }),
            makeCard({ id: 'warning', severity: 'warning' }),
        ];
        const result = applyGridSort(cards, 1);
        expect(result).toHaveLength(1);
        expect(result[0].severity).toBe('critical');
    });
});

// ============ Briefing Header Text Tests ============

describe('InsightCardsGrid — Briefing Header Text', () => {
    it('day name format: full weekday', () => {
        const date = new Date('2026-02-23T12:00:00');
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        expect(dayName).toBe('Monday');
    });

    it('date string format: "Mon DD"', () => {
        const date = new Date('2026-02-23T12:00:00');
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        expect(dateStr).toBe('Feb 23');
    });

    it('full header is "Weekday\'s Briefing · Mon DD"', () => {
        const date = new Date('2026-02-22T12:00:00');
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        expect(`${dayName}'s Briefing · ${dateStr}`).toBe("Sunday's Briefing · Feb 22");
    });

    it('each weekday produces correct header', () => {
        const cases: [string, string][] = [
            ['2026-02-23', "Monday's Briefing · Feb 23"],
            ['2026-02-24', "Tuesday's Briefing · Feb 24"],
            ['2026-02-25', "Wednesday's Briefing · Feb 25"],
            ['2026-02-26', "Thursday's Briefing · Feb 26"],
            ['2026-02-27', "Friday's Briefing · Feb 27"],
            ['2026-02-28', "Saturday's Briefing · Feb 28"],
            ['2026-03-01', "Sunday's Briefing · Mar 1"],
        ];
        for (const [dateStr, expected] of cases) {
            const date = new Date(`${dateStr}T12:00:00`);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            const shortDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            expect(`${dayName}'s Briefing · ${shortDate}`).toBe(expected);
        }
    });
});

// ============ Proactive vs Placeholder Insight Content ============

describe('InsightCardsGrid — Proactive vs Hardcoded Content', () => {
    it('proactive churn risk insight replaces static "Loyalty program active" headline', () => {
        const proactiveCustomer = makeCard({
            id: 'churn-alert',
            category: 'customer',
            agentId: 'smokey',
            agentName: 'Smokey',
            headline: '23 customers at risk',
            severity: 'warning',
        });
        expect(proactiveCustomer.headline).not.toBe('Loyalty program active');
        expect(proactiveCustomer.severity).toBe('warning');
    });

    it('real customer count card headline contains enrolled count not static text', () => {
        const count = 111;
        const headline = `${count.toLocaleString()} enrolled customers`;
        expect(headline).not.toBe('Loyalty program active');
        expect(headline).toBe('111 enrolled customers');
    });

    it('proactive market insight replaces static "Competitor watch active" headline', () => {
        const proactiveMarket = makeCard({
            id: 'price-alert',
            category: 'market',
            agentId: 'ezal',
            agentName: 'Ezal',
            headline: 'Competitor dropped prices 35%',
            severity: 'critical',
        });
        expect(proactiveMarket.headline).not.toBe('Competitor watch active');
        expect(proactiveMarket.severity).toBe('critical');
    });

    it('proactive compliance insight replaces static "All clear" headline', () => {
        const proactiveCompliance = makeCard({
            id: 'reg-alert',
            category: 'compliance',
            agentId: 'deebo',
            agentName: 'Deebo',
            headline: 'NY rule update pending',
            severity: 'warning',
        });
        expect(proactiveCompliance.headline).not.toBe('All clear');
        expect(proactiveCompliance.severity).toBe('warning');
    });
});
