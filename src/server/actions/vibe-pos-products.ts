'use server';

/**
 * Vibe Builder POS Product Integration
 *
 * Fetches products from connected POS for use in website builder blocks
 */

import { createServerClient } from '@/firebase/server-client';
import { DutchieClient } from '@/lib/pos/adapters/dutchie';
import {
  ALLeavesClient,
  type ALLeavesConfig,
} from '@/lib/pos/adapters/alleaves';
import type { POSProduct } from '@/lib/pos/types';
import { logger } from '@/lib/logger';

export interface BuilderProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  thcPercent?: number;
  cbdPercent?: number;
  imageUrl?: string;
  isOnSale?: boolean;
  salePrice?: number;
  saleBadgeText?: string;
}

/**
 * Get products from user's connected POS for use in builder
 */
export async function getBuilderProducts(
  userId: string,
  limit = 12
): Promise<{ success: boolean; products?: BuilderProduct[]; error?: string }> {
  try {
    const { firestore } = await createServerClient();

    // 1. Get user's organization
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const orgId = userData?.orgId || userData?.brandId || userData?.currentOrgId;

    if (!orgId) {
      return { success: false, error: 'No organization found for user' };
    }

    // 2. Find location with POS config
    const locationsSnapshot = await firestore
      .collection('locations')
      .where('orgId', '==', orgId)
      .limit(1)
      .get();

    if (locationsSnapshot.empty) {
      // No POS configured - return demo products
      return { success: true, products: getDemoProducts(limit) };
    }

    const locationDoc = locationsSnapshot.docs[0];
    const locationData = locationDoc.data();
    const posConfig = locationData?.posConfig;

    if (
      !posConfig ||
      posConfig.provider === 'none' ||
      posConfig.status !== 'active'
    ) {
      // No active POS - return demo products
      return { success: true, products: getDemoProducts(limit) };
    }

    // 3. Initialize POS client
    let client;

    if (posConfig.provider === 'dutchie') {
      client = new DutchieClient({
        apiKey: posConfig.apiKey,
        storeId: posConfig.dispensaryId || posConfig.storeId,
      });
    } else if (posConfig.provider === 'alleaves') {
      const alleavesConfig: ALLeavesConfig = {
        apiKey: posConfig.apiKey,
        username: posConfig.username || process.env.ALLEAVES_USERNAME,
        password: posConfig.password || process.env.ALLEAVES_PASSWORD,
        pin: posConfig.pin || process.env.ALLEAVES_PIN,
        storeId: posConfig.storeId,
        locationId: posConfig.locationId || posConfig.storeId,
        partnerId: posConfig.partnerId,
        environment: posConfig.environment || 'production',
      };

      client = new ALLeavesClient(alleavesConfig);
    } else {
      logger.warn('[VIBE_PRODUCTS] Unsupported POS provider', {
        provider: posConfig.provider,
      });
      return { success: true, products: getDemoProducts(limit) };
    }

    // 4. Fetch menu
    const posProducts = await client.fetchMenu();

    // 5. Transform to builder format and limit results
    const products: BuilderProduct[] = posProducts
      .slice(0, limit)
      .map((p: POSProduct) => ({
        id: p.externalId,
        name: p.name,
        brand: p.brand,
        category: p.category,
        price: p.isOnSale && p.salePrice ? p.salePrice : p.price,
        thcPercent: p.thcPercent,
        cbdPercent: p.cbdPercent,
        imageUrl:
          p.imageUrl ||
          `https://via.placeholder.com/300x300?text=${encodeURIComponent(p.name)}`,
        isOnSale: p.isOnSale,
        salePrice: p.salePrice,
        saleBadgeText: p.saleBadgeText,
      }));

    logger.info('[VIBE_PRODUCTS] Fetched products for builder', {
      userId,
      orgId,
      count: products.length,
    });

    return { success: true, products };
  } catch (error) {
    logger.error('[VIBE_PRODUCTS] Failed to fetch products:', error as Error);
    // Return demo products on error
    return { success: true, products: getDemoProducts(limit) };
  }
}

/**
 * Demo products for testing or when POS is not connected
 */
function getDemoProducts(limit = 12): BuilderProduct[] {
  const demoProducts: BuilderProduct[] = [
    {
      id: 'demo-1',
      name: 'Blue Dream',
      brand: 'Top Shelf',
      category: 'Flower',
      price: 45,
      thcPercent: 22,
      cbdPercent: 0.5,
      imageUrl: 'https://via.placeholder.com/300x300?text=Blue+Dream',
    },
    {
      id: 'demo-2',
      name: 'OG Kush',
      brand: 'Premium',
      category: 'Flower',
      price: 50,
      thcPercent: 25,
      cbdPercent: 0.3,
      imageUrl: 'https://via.placeholder.com/300x300?text=OG+Kush',
      isOnSale: true,
      salePrice: 40,
      saleBadgeText: '20% OFF',
    },
    {
      id: 'demo-3',
      name: 'Sour Diesel',
      brand: 'Select',
      category: 'Flower',
      price: 42,
      thcPercent: 20,
      cbdPercent: 0.2,
      imageUrl: 'https://via.placeholder.com/300x300?text=Sour+Diesel',
    },
    {
      id: 'demo-4',
      name: 'Gelato',
      brand: 'Top Shelf',
      category: 'Flower',
      price: 48,
      thcPercent: 24,
      cbdPercent: 0.4,
      imageUrl: 'https://via.placeholder.com/300x300?text=Gelato',
    },
    {
      id: 'demo-5',
      name: 'Wedding Cake',
      brand: 'Premium',
      category: 'Flower',
      price: 52,
      thcPercent: 26,
      cbdPercent: 0.3,
      imageUrl: 'https://via.placeholder.com/300x300?text=Wedding+Cake',
      isOnSale: true,
      salePrice: 45,
      saleBadgeText: 'SALE',
    },
    {
      id: 'demo-6',
      name: 'Gorilla Glue',
      brand: 'Select',
      category: 'Flower',
      price: 46,
      thcPercent: 23,
      cbdPercent: 0.5,
      imageUrl: 'https://via.placeholder.com/300x300?text=Gorilla+Glue',
    },
    {
      id: 'demo-7',
      name: 'Strawberry Cough',
      brand: 'Top Shelf',
      category: 'Flower',
      price: 44,
      thcPercent: 21,
      cbdPercent: 0.6,
      imageUrl: 'https://via.placeholder.com/300x300?text=Strawberry+Cough',
    },
    {
      id: 'demo-8',
      name: 'Purple Haze',
      brand: 'Premium',
      category: 'Flower',
      price: 47,
      thcPercent: 22,
      cbdPercent: 0.4,
      imageUrl: 'https://via.placeholder.com/300x300?text=Purple+Haze',
    },
    {
      id: 'demo-9',
      name: 'Granddaddy Purple',
      brand: 'Select',
      category: 'Flower',
      price: 49,
      thcPercent: 24,
      cbdPercent: 0.3,
      imageUrl: 'https://via.placeholder.com/300x300?text=GDP',
      isOnSale: true,
      salePrice: 42,
      saleBadgeText: '$7 OFF',
    },
    {
      id: 'demo-10',
      name: 'Jack Herer',
      brand: 'Top Shelf',
      category: 'Flower',
      price: 45,
      thcPercent: 21,
      cbdPercent: 0.5,
      imageUrl: 'https://via.placeholder.com/300x300?text=Jack+Herer',
    },
    {
      id: 'demo-11',
      name: 'Pineapple Express',
      brand: 'Premium',
      category: 'Flower',
      price: 43,
      thcPercent: 20,
      cbdPercent: 0.4,
      imageUrl: 'https://via.placeholder.com/300x300?text=Pineapple+Express',
    },
    {
      id: 'demo-12',
      name: 'White Widow',
      brand: 'Select',
      category: 'Flower',
      price: 46,
      thcPercent: 23,
      cbdPercent: 0.3,
      imageUrl: 'https://via.placeholder.com/300x300?text=White+Widow',
    },
  ];

  return demoProducts.slice(0, limit);
}
