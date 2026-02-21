/**
 * Inventory Velocity Insights Generator (Money Mike)
 *
 * Generates insights about product sales velocity, expiring inventory,
 * and slow-moving products to help dispensaries optimize inventory management.
 */

import { InsightGeneratorBase } from '../insight-generator-base';
import { getExpiringInventory, getSlowMovingInventory } from '../../alleaves/inventory-intelligence';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { InsightCard } from '@/types/insight-cards';

// ============ Types ============

interface ProductSalesData {
  productId: string;
  productName: string;
  salesLast7Days: number;
  salesPrevious7Days: number;
  trend: number; // percentage change
}

interface ALLeavesConfig_ {
  username: string;
  password: string;
  pin?: string;
  storeId: string;
  locationId: string;
}

// ============ Generator ============

export class InventoryVelocityGenerator extends InsightGeneratorBase {
  private alleaveClient: ALLeavesClient | null = null;

  constructor(orgId: string) {
    super(orgId, 'money_mike', 'Money Mike', 'velocity');
  }

  /**
   * Generate all velocity insights
   */
  async generate(): Promise<InsightCard[]> {
    const insights: InsightCard[] = [];

    try {
      logger.info('[InventoryVelocity] Generating insights', { orgId: this.orgId });

      // 1. Top Sellers insight
      const topSellers = await this.getTopSellers();
      if (topSellers && topSellers.length > 0) {
        const topSellerInsight = this.createTopSellerInsight(topSellers[0]);
        insights.push(topSellerInsight);
      }

      // 2. Expiring Inventory insight
      const expiringProducts = await getExpiringInventory(this.orgId, 30);
      if (expiringProducts.length > 0) {
        const expiringInsight = this.createExpiringInsight(expiringProducts);
        insights.push(expiringInsight);
      }

      // 3. Slow Movers insight
      const slowMovers = await getSlowMovingInventory(this.orgId, 30);
      if (slowMovers.length > 0) {
        const slowMoverInsight = this.createSlowMoverInsight(slowMovers);
        insights.push(slowMoverInsight);
      }

      // Save to Firestore
      await this.saveInsights(insights);

      logger.info('[InventoryVelocity] Generated insights', {
        orgId: this.orgId,
        count: insights.length,
      });

      return insights;
    } catch (error) {
      logger.error('[InventoryVelocity] Error generating insights', {
        error,
        orgId: this.orgId,
      });
      return [];
    }
  }

  /**
   * Get top-selling products for the last 7 days
   */
  private async getTopSellers(): Promise<ProductSalesData[] | null> {
    try {
      const client = await this.getAlleavesClient();
      if (!client) return null;

      // Fetch orders from last 14 days (to compare previous 7 days)
      const today = new Date();
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

      const orders = await client.getAllOrders(
        5000,
        twoWeeksAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );

      if (!orders || orders.length === 0) {
        logger.warn('[InventoryVelocity] No orders found', { orgId: this.orgId });
        return [];
      }

      // Aggregate sales by product for each 7-day window
      const lastWeekSales = new Map<string, number>();
      const previousWeekSales = new Map<string, number>();

      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      orders.forEach((order) => {
        const orderDate = new Date(order.date_order || order.createdAt || new Date());

        // Skip invalid dates
        if (isNaN(orderDate.getTime())) return;

        const items = order.items || [];
        const isLastWeek = orderDate >= oneWeekAgo;

        items.forEach((item: any) => {
          const productId = item.product_id || item.id_item;
          const quantity = item.quantity || 1;

          if (isLastWeek) {
            const current = lastWeekSales.get(productId) || 0;
            lastWeekSales.set(productId, current + quantity);
          } else {
            const current = previousWeekSales.get(productId) || 0;
            previousWeekSales.set(productId, current + quantity);
          }
        });
      });

      // Fetch product names
      const menu = await client.fetchMenu();
      const productMap = new Map(menu.map((p) => [p.externalId, p.name]));

      // Calculate trends and sort by last week sales
      const topSellers: ProductSalesData[] = Array.from(lastWeekSales.entries())
        .map(([productId, lastWeekCount]) => {
          const previousWeekCount = previousWeekSales.get(productId) || 0;
          const trend =
            previousWeekCount > 0
              ? ((lastWeekCount - previousWeekCount) / previousWeekCount) * 100
              : lastWeekCount > 0
                ? 100
                : 0;

          return {
            productId,
            productName: productMap.get(productId) || productId,
            salesLast7Days: lastWeekCount,
            salesPrevious7Days: previousWeekCount,
            trend,
          };
        })
        .sort((a, b) => b.salesLast7Days - a.salesLast7Days)
        .slice(0, 10); // Top 10

      logger.info('[InventoryVelocity] Calculated top sellers', {
        orgId: this.orgId,
        count: topSellers.length,
      });

      return topSellers;
    } catch (error) {
      logger.error('[InventoryVelocity] Error calculating top sellers', {
        error,
        orgId: this.orgId,
      });
      return null;
    }
  }

  /**
   * Get or create Alleaves client
   */
  private async getAlleavesClient(): Promise<ALLeavesClient | null> {
    try {
      if (this.alleaveClient) {
        return this.alleaveClient;
      }

      // Fetch tenant config to get POS credentials
      const db = getAdminFirestore();
      const tenantDoc = await db.collection('tenants').doc(this.orgId).get();

      if (!tenantDoc.exists) {
        logger.warn('[InventoryVelocity] Tenant not found', { orgId: this.orgId });
        return null;
      }

      const tenantData = tenantDoc.data();
      const posConfig = tenantData?.pos_config;

      if (!posConfig || posConfig.provider !== 'alleaves') {
        logger.warn('[InventoryVelocity] Alleaves not configured', { orgId: this.orgId });
        return null;
      }

      // Use environment variables for now (hardcoded for Thrive)
      const config: ALLeavesConfig = {
        username: process.env.ALLEAVES_USERNAME || '',
        password: process.env.ALLEAVES_PASSWORD || '',
        pin: process.env.ALLEAVES_PIN,
        storeId: process.env.ALLEAVES_LOCATION_ID || '1',
        locationId: process.env.ALLEAVES_LOCATION_ID || '1',
      };

      if (!config.username || !config.password) {
        logger.warn('[InventoryVelocity] Alleaves credentials not configured', {
          orgId: this.orgId,
        });
        return null;
      }

      this.alleaveClient = new ALLeavesClient(config);
      return this.alleaveClient;
    } catch (error) {
      logger.error('[InventoryVelocity] Error initializing Alleaves client', {
        error,
        orgId: this.orgId,
      });
      return null;
    }
  }

  /**
   * Create top seller insight card
   */
  private createTopSellerInsight(product: ProductSalesData): InsightCard {
    const trendValue =
      product.trend > 0
        ? `+${Math.round(product.trend)}%`
        : product.trend === 0
          ? '0%'
          : `${Math.round(product.trend)}%`;

    return this.createInsight({
      title: 'TOP SELLER THIS WEEK',
      headline: `${product.productName} ${trendValue}`,
      subtext: `${product.salesLast7Days} units sold | +${product.salesLast7Days - product.salesPrevious7Days} vs last week`,
      value: product.salesLast7Days,
      unit: 'units',
      trend: product.trend > 0 ? 'up' : product.trend < 0 ? 'down' : 'stable',
      trendValue,
      severity: 'success',
      actionable: true,
      ctaLabel: 'Create Bundle',
      threadType: 'bundle',
      threadPrompt: `Create a bundle featuring ${product.productName}, our top seller this week with ${product.salesLast7Days} units sold (${trendValue} vs last week).`,
      dataSource: 'POS orders (Alleaves)',
    });
  }

  /**
   * Create expiring inventory insight card
   */
  private createExpiringInsight(
    products: Array<{
      productName: string;
      daysUntilExpiry: number;
      urgency: string;
    }>
  ): InsightCard {
    const criticalProducts = products.filter((p) => p.urgency === 'high');
    const severity =
      criticalProducts.length > 0
        ? 'critical'
        : products.length > 10
          ? 'warning'
          : 'info';

    const headline =
      criticalProducts.length > 0
        ? `${criticalProducts.length} products expiring < 2 weeks`
        : `${products.length} products expiring in 30 days`;

    const subtext =
      criticalProducts.length > 0
        ? `Most urgent: ${criticalProducts[0].productName} (${criticalProducts[0].daysUntilExpiry} days)`
        : products.length > 0
          ? `Soonest: ${products[0].productName} (${products[0].daysUntilExpiry} days)`
          : undefined;

    return this.createInsight({
      title: 'EXPIRING SOON',
      headline,
      subtext,
      value: products.length,
      unit: 'products',
      severity,
      actionable: true,
      ctaLabel: severity === 'critical' ? 'Create Promo' : 'Review',
      threadType: 'inventory_promo',
      threadPrompt: `I have ${products.length} products expiring within 30 days. Help me create a clearance promotion to move inventory before expiration.`,
      dataSource: 'Inventory batches (Alleaves)',
    });
  }

  /**
   * Create slow movers insight card
   */
  private createSlowMoverInsight(
    products: Array<{
      productId: string;
      daysInInventory: number;
      stockLevel: number;
    }>
  ): InsightCard {
    const totalStock = products.reduce((sum, p) => sum + p.stockLevel, 0);
    const oldestProduct = products[0];

    return this.createInsight({
      title: 'SLOW MOVERS',
      headline: `${products.length} slow-moving products`,
      subtext:
        totalStock > 0
          ? `${totalStock} units in stock | Oldest: ${oldestProduct.daysInInventory} days`
          : undefined,
      value: products.length,
      unit: 'products',
      severity: products.length > 20 ? 'warning' : 'info',
      actionable: true,
      ctaLabel: 'Create Bundle or Discount',
      threadType: 'bundle',
      threadPrompt: `I have ${products.length} slow-moving products taking up inventory (${totalStock} units). Help me create bundles or apply discounts to move them faster.`,
      dataSource: 'Inventory age (Alleaves)',
    });
  }
}
