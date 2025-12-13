
import { forecastDemandSeasonality, DailySales } from '../../src/server/algorithms/pops-algo';

describe('Pops Seasonality Algorithms', () => {

    test('forecastDemandSeasonality should respect day-of-week patterns', () => {
        // Create 2 weeks of data
        // Mon (100), Tue (50), Wed (50), Thu (50), Fri (200), Sat (200), Sun (100)
        // Repeat
        const baseDate = new Date('2025-01-01'); // Wednesday
        const history: DailySales[] = [];

        const patterns = [50, 50, 200, 200, 100, 100, 50]; // Wed, Thu, Fri, Sat, Sun, Mon, Tue

        for (let i = 0; i < 14; i++) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);
            const dayIndex = i % 7;
            history.push({
                date: d.toISOString().split('T')[0],
                quantity: patterns[dayIndex]
            });
        }

        // Horizon: Next 3 days.
        // Last day was Jan 14 (Tuesday). Next is Jan 15 (Wed).
        // Wed avg = 50.
        // Thu avg = 50.
        // Fri avg = 200.

        const forecast = forecastDemandSeasonality(history, 3);

        expect(forecast[0]).toBe(50);
        expect(forecast[1]).toBe(50);
        expect(forecast[2]).toBe(200);
    });

    test('forecastDemandSeasonality handles missing history gracefully', () => {
        const forecast = forecastDemandSeasonality([], 3);
        expect(forecast).toEqual([0, 0, 0]);
    });
});
