import {
    aggregateElroyTopSellers,
    formatElroyRecentTransactions,
    resolveElroySalesWindow,
    summarizeElroySalesPeriod,
} from '../elroy-sales';

describe('elroy-sales helpers', () => {
    it('resolves explicit month lookups for past sales questions', () => {
        const window = resolveElroySalesWindow({ year: 2026, month: 2 });

        expect(window.startDate).toBe('2026-02-01');
        expect(window.endDate).toBe('2026-02-28');
        expect(window.label).toMatch(/February 2026/);
    });

    it('resolves yesterday relative to the Thrive store day', () => {
        const window = resolveElroySalesWindow(
            { period: 'yesterday' },
            { now: new Date('2026-04-10T18:00:00Z') }
        );

        expect(window.startDate).toBe('2026-04-09');
        expect(window.endDate).toBe('2026-04-09');
    });

    it('ranks top sellers by units by default instead of revenue', () => {
        const topSellers = aggregateElroyTopSellers([
            {
                id: 'order-1',
                items: [
                    { name: 'High Revenue One', qty: 1, price: 90, category: 'flower' },
                    { name: 'Unit Leader', qty: 3, price: 20, category: 'edible' },
                ],
            },
        ]);

        expect(topSellers[0]).toMatchObject({
            name: 'Unit Leader',
            unitsSold: 3,
            revenue: 60,
        });
        expect(topSellers[1]).toMatchObject({
            name: 'High Revenue One',
            unitsSold: 1,
            revenue: 90,
        });
    });

    it('summarizes recent transactions with quantity-aware item counts', () => {
        const transactions = formatElroyRecentTransactions([
            {
                id: 'alleaves_4838',
                total: 100.5,
                status: 'completed',
                createdAt: '2026-04-10T19:08:45.553Z',
                items: [
                    { name: 'Pre-roll', qty: 2, price: 10 },
                    { name: 'Drink', qty: 1, price: 6 },
                ],
            },
        ]);

        expect(transactions[0]).toMatchObject({
            id: 'alleaves_4838',
            total: 100.5,
            itemCount: 3,
            items: 'Pre-roll x2, Drink',
            status: 'completed',
        });
    });

    it('summarizes gross sales for a period', () => {
        const summary = summarizeElroySalesPeriod([
            { id: '1', total: 10 },
            { id: '2', totals: { total: 20.25 } },
        ]);

        expect(summary).toEqual({
            grossSales: 30.25,
            orderCount: 2,
            averageTicket: 15.13,
        });
    });
});
