
// src/hooks/use-menu-data.ts
import type { Product, Retailer, Review } from '@/types/domain';

export type MenuLocation = Retailer;
export type MenuProduct = Product;
export type MenuReview = Review;

export type UseMenuDataOptions = {
  serverProducts?: MenuProduct[];
  serverLocations?: MenuLocation[];
};

export function useMenuData(options: UseMenuDataOptions = {}) {
  const {
    serverProducts = [],
    serverLocations = [],
  } = options;

  return {
    products: serverProducts,
    locations: serverLocations,
    reviews: [] as MenuReview[],
    brandId: "",
    isLoading: false,
  };
}
