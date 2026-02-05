'use client';

/**
 * useDynamicPrice Hook
 *
 * Client-side hook for fetching dynamic pricing with automatic caching.
 * Calls calculateDynamicPrice() Server Action and caches results for 5 minutes.
 *
 * Usage:
 * const { dynamicPrice, isLoading, error, hasDiscount } = useDynamicPrice({
 *   productId: product.id,
 *   orgId: product.brandId,
 *   enabled: true,
 * });
 */

import { useState, useEffect } from 'react';
import { calculateDynamicPrice } from '@/app/actions/dynamic-pricing';
import type { DynamicPrice } from '@/types/dynamic-pricing';

interface UseDynamicPriceOptions {
  productId: string;
  orgId: string;
  customerId?: string;
  enabled?: boolean; // Allow disabling for performance optimization
}

interface UseDynamicPriceResult {
  dynamicPrice: DynamicPrice | null;
  isLoading: boolean;
  error: string | null;
  hasDiscount: boolean;
}

// ============ In-Memory Cache ============

interface CacheEntry {
  data: DynamicPrice;
  expiry: number;
}

// Global cache shared across all component instances
const priceCache = new Map<string, CacheEntry>();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Generate cache key for price lookup
 */
function getCacheKey(productId: string, orgId: string, customerId?: string): string {
  return `${orgId}:${productId}:${customerId || 'anon'}`;
}

/**
 * Get cached price if available and not expired
 */
function getCachedPrice(key: string): DynamicPrice | null {
  const cached = priceCache.get(key);

  if (!cached) {
    return null;
  }

  // Check expiry
  if (cached.expiry < Date.now()) {
    priceCache.delete(key);
    return null;
  }

  return cached.data;
}

/**
 * Store price in cache with TTL
 */
function setCachedPrice(key: string, price: DynamicPrice): void {
  priceCache.set(key, {
    data: price,
    expiry: Date.now() + CACHE_TTL,
  });
}

/**
 * Clear all cached prices (useful for manual refresh)
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

/**
 * Clear cached price for specific product
 */
export function clearProductPriceCache(productId: string, orgId: string, customerId?: string): void {
  const key = getCacheKey(productId, orgId, customerId);
  priceCache.delete(key);
}

// ============ Hook Implementation ============

export function useDynamicPrice(options: UseDynamicPriceOptions): UseDynamicPriceResult {
  const { productId, orgId, customerId, enabled = true } = options;

  const [dynamicPrice, setDynamicPrice] = useState<DynamicPrice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch if disabled or missing required params
    if (!enabled || !productId || !orgId) {
      setIsLoading(false);
      setDynamicPrice(null);
      return;
    }

    const fetchPrice = async () => {
      const cacheKey = getCacheKey(productId, orgId, customerId);

      // Try cache first
      const cached = getCachedPrice(cacheKey);
      if (cached) {
        setDynamicPrice(cached);
        setIsLoading(false);
        setError(null);
        return;
      }

      // Cache miss - fetch from server
      try {
        setIsLoading(true);
        setError(null);

        const result = await calculateDynamicPrice({
          productId,
          orgId,
          customerId,
          timestamp: new Date(),
        });

        if (result.success && result.data) {
          // Store in cache
          setCachedPrice(cacheKey, result.data);
          setDynamicPrice(result.data);
        } else {
          // No dynamic pricing available (not an error - just no rules apply)
          setDynamicPrice(null);

          if (result.error) {
            console.warn('[useDynamicPrice] Calculation warning:', result.error);
          }
        }
      } catch (err) {
        // Network or unexpected error - log but don't show to user
        console.error('[useDynamicPrice] Error fetching price:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch dynamic price');
        setDynamicPrice(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrice();
  }, [productId, orgId, customerId, enabled]);

  // Calculate hasDiscount
  const hasDiscount =
    dynamicPrice !== null &&
    dynamicPrice.dynamicPrice < dynamicPrice.originalPrice;

  return {
    dynamicPrice,
    isLoading,
    error,
    hasDiscount,
  };
}

// ============ Batch Fetching Hook ============

/**
 * Fetch prices for multiple products in parallel
 * More efficient than individual useDynamicPrice calls for grids
 */
export function useBatchDynamicPrices(options: {
  productIds: string[];
  orgId: string;
  customerId?: string;
  enabled?: boolean;
}): {
  prices: Map<string, DynamicPrice>;
  isLoading: boolean;
  error: string | null;
} {
  const { productIds, orgId, customerId, enabled = true } = options;

  const [prices, setPrices] = useState<Map<string, DynamicPrice>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || productIds.length === 0 || !orgId) {
      setIsLoading(false);
      return;
    }

    const fetchPrices = async () => {
      setIsLoading(true);
      setError(null);

      const priceMap = new Map<string, DynamicPrice>();

      // Check cache first
      const uncachedIds: string[] = [];

      for (const productId of productIds) {
        const cacheKey = getCacheKey(productId, orgId, customerId);
        const cached = getCachedPrice(cacheKey);

        if (cached) {
          priceMap.set(productId, cached);
        } else {
          uncachedIds.push(productId);
        }
      }

      // Fetch uncached prices in parallel
      if (uncachedIds.length > 0) {
        try {
          const promises = uncachedIds.map(productId =>
            calculateDynamicPrice({
              productId,
              orgId,
              customerId,
              timestamp: new Date(),
            })
          );

          const results = await Promise.all(promises);

          uncachedIds.forEach((productId, index) => {
            const result = results[index];
            if (result.success && result.data) {
              const cacheKey = getCacheKey(productId, orgId, customerId);
              setCachedPrice(cacheKey, result.data);
              priceMap.set(productId, result.data);
            }
          });
        } catch (err) {
          console.error('[useBatchDynamicPrices] Error fetching prices:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch prices');
        }
      }

      setPrices(priceMap);
      setIsLoading(false);
    };

    fetchPrices();
  }, [productIds.join(','), orgId, customerId, enabled]);

  return { prices, isLoading, error };
}
