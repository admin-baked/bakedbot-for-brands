/**
 * Inventory Demand Forecasting Service
 * Predicts stock depletion and generates reorder alerts
 */



import { createServerClient } from '@/firebase/server-client';

export interface InventoryForecast {
    productId: string;
    productName: string;
    currentStock: number;
    dailySalesVelocity: number;
    daysUntilStockout: number;
    predictedStockoutDate: Date;
    reorderPoint: number;
    status: 'healthy' | 'low_stock' | 'critical' | 'out_of_stock';
    recommendedReorderQuantity: number;
}

export class InventoryForecastingService {
    /**
     * Generate inventory forecast for a brand
     */
    async generateInventoryForecast(brandId: string): Promise<InventoryForecast[]> {
        const { firestore } = await createServerClient();

        // 1. Get all products
        const productsSnapshot = await firestore
            .collection('products')
            .where('brand_id', '==', brandId)
            .get();

        // 2. Get sales history (last 30 days)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const ordersSnapshot = await firestore
            .collection('orders')
            .where('brandId', '==', brandId)
            .where('createdAt', '>=', startDate)
            .get();

        // Calculate sales velocity per product
        const productSales: Record<string, number> = {};
        ordersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.items) {
                data.items.forEach((item: any) => {
                    if (!productSales[item.productId]) productSales[item.productId] = 0;
                    productSales[item.productId] += item.quantity || 1;
                });
            }
        });

        const forecasts: InventoryForecast[] = [];

        for (const doc of productsSnapshot.docs) {
            const product = doc.data();
            const productId = doc.id;
            const currentStock = product.stock || 0; // Assuming stock field exists
            const totalSales30Days = productSales[productId] || 0;
            const dailySalesVelocity = totalSales30Days / 30;

            let daysUntilStockout = Infinity;
            let predictedStockoutDate = new Date();
            predictedStockoutDate.setFullYear(predictedStockoutDate.getFullYear() + 1); // Default far future

            if (dailySalesVelocity > 0) {
                daysUntilStockout = currentStock / dailySalesVelocity;
                predictedStockoutDate = new Date();
                predictedStockoutDate.setDate(predictedStockoutDate.getDate() + Math.floor(daysUntilStockout));
            }

            // Determine status
            let status: InventoryForecast['status'] = 'healthy';
            if (currentStock === 0) {
                status = 'out_of_stock';
            } else if (daysUntilStockout < 7) {
                status = 'critical';
            } else if (daysUntilStockout < 14) {
                status = 'low_stock';
            }

            // Calculate reorder point (Lead time demand + Safety stock)
            // Assuming 7 day lead time and 50% safety stock factor
            const leadTimeDays = 7;
            const leadTimeDemand = dailySalesVelocity * leadTimeDays;
            const safetyStock = leadTimeDemand * 0.5;
            const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);

            const recommendedReorderQuantity = Math.ceil(dailySalesVelocity * 30); // 30 days of stock

            forecasts.push({
                productId,
                productName: product.name,
                currentStock,
                dailySalesVelocity: parseFloat(dailySalesVelocity.toFixed(2)),
                daysUntilStockout: Math.floor(daysUntilStockout),
                predictedStockoutDate,
                reorderPoint,
                status,
                recommendedReorderQuantity,
            });
        }

        // Sort by urgency (critical first)
        return forecasts.sort((a, b) => {
            const statusPriority = { out_of_stock: 0, critical: 1, low_stock: 2, healthy: 3 };
            return statusPriority[a.status] - statusPriority[b.status];
        });
    }
}

export const inventoryForecastingService = new InventoryForecastingService();
