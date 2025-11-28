/**
 * Sales Forecasting Service
 * Predicts future revenue and order volume using historical data
 */



import { createServerClient } from '@/firebase/server-client';

export interface ForecastData {
    date: string;
    predictedRevenue: number;
    confidenceInterval: {
        lower: number;
        upper: number;
    };
    predictedOrders: number;
}

export interface ForecastResult {
    forecasts: ForecastData[];
    summary: {
        totalPredictedRevenue: number;
        averageDailyRevenue: number;
        growthTrend: number; // percentage
    };
    generatedAt: Date;
}

export class ForecastingService {
    /**
     * Generate sales forecast for the next N days
     */
    async generateForecast(brandId: string, days: number = 30): Promise<ForecastResult> {
        const { firestore } = await createServerClient();

        // 1. Fetch historical data (last 90 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);

        const ordersSnapshot = await firestore
            .collection('orders')
            .where('brandId', '==', brandId)
            .where('createdAt', '>=', startDate)
            .orderBy('createdAt', 'asc')
            .get();

        // 2. Aggregate daily sales
        const dailySales: Record<string, { revenue: number; orders: number }> = {};

        ordersSnapshot.forEach(doc => {
            const data = doc.data();
            const date = data.createdAt.toDate().toISOString().split('T')[0];

            if (!dailySales[date]) {
                dailySales[date] = { revenue: 0, orders: 0 };
            }

            dailySales[date].revenue += data.total || 0;
            dailySales[date].orders += 1;
        });

        // Fill in missing days with 0
        const historicalData: { date: string; revenue: number; orders: number }[] = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            historicalData.push({
                date: dateStr,
                revenue: dailySales[dateStr]?.revenue || 0,
                orders: dailySales[dateStr]?.orders || 0,
            });
        }

        // 3. Calculate forecast (Simple Moving Average + Linear Trend)
        // This is a simplified model for MVP. Real ML would go here.

        const forecasts: ForecastData[] = [];
        let totalPredictedRevenue = 0;

        // Calculate average daily growth (trend)
        const firstHalf = historicalData.slice(0, Math.floor(historicalData.length / 2));
        const secondHalf = historicalData.slice(Math.floor(historicalData.length / 2));

        const avgFirst = firstHalf.reduce((sum, d) => sum + d.revenue, 0) / firstHalf.length || 0;
        const avgSecond = secondHalf.reduce((sum, d) => sum + d.revenue, 0) / secondHalf.length || 0;

        const growthRate = avgFirst > 0 ? (avgSecond - avgFirst) / avgFirst : 0;
        const dailyGrowthFactor = 1 + (growthRate / (historicalData.length / 2));

        // Calculate baseline (last 7 days average)
        const recentDays = historicalData.slice(-7);
        let currentBaseRevenue = recentDays.reduce((sum, d) => sum + d.revenue, 0) / recentDays.length || 0;
        let currentBaseOrders = recentDays.reduce((sum, d) => sum + d.orders, 0) / recentDays.length || 0;

        // Generate future predictions
        for (let i = 1; i <= days; i++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + i);
            const dateStr = futureDate.toISOString().split('T')[0];

            // Apply growth trend
            currentBaseRevenue *= dailyGrowthFactor;
            currentBaseOrders *= dailyGrowthFactor;

            // Add some randomness/seasonality (simplified)
            const dayOfWeek = futureDate.getDay();
            let seasonalityMultiplier = 1.0;
            if (dayOfWeek === 5 || dayOfWeek === 6) seasonalityMultiplier = 1.2; // Weekend bump
            if (dayOfWeek === 0) seasonalityMultiplier = 0.9; // Sunday dip

            const predictedRevenue = currentBaseRevenue * seasonalityMultiplier;
            const predictedOrders = Math.round(currentBaseOrders * seasonalityMultiplier);

            // Calculate confidence interval (simplified: +/- 20%)
            const margin = predictedRevenue * 0.2;

            forecasts.push({
                date: dateStr,
                predictedRevenue: Math.round(predictedRevenue * 100) / 100,
                confidenceInterval: {
                    lower: Math.max(0, Math.round((predictedRevenue - margin) * 100) / 100),
                    upper: Math.round((predictedRevenue + margin) * 100) / 100,
                },
                predictedOrders,
            });

            totalPredictedRevenue += predictedRevenue;
        }

        return {
            forecasts,
            summary: {
                totalPredictedRevenue: Math.round(totalPredictedRevenue * 100) / 100,
                averageDailyRevenue: Math.round((totalPredictedRevenue / days) * 100) / 100,
                growthTrend: Math.round(growthRate * 100),
            },
            generatedAt: new Date(),
        };
    }
}

export const forecastingService = new ForecastingService();
