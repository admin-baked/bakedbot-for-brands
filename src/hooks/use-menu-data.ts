'use client';

import { useStore } from './use-store';
import { useProducts } from '@/firebase/firestore/use-products';
import { useDemoData } from './use-demo-data';

/**
 * A unified hook to get menu data (products and locations).
 * It intelligently switches between static demo data and live Firestore data
 * based on the global `isUsingDemoData` state.
 * This ensures that both server and client renders are consistent, preventing
 * hydration errors.
 */
export function useMenuData() {
  const { isUsingDemoData, _hasHydrated } = useStore(state => ({
    isUsingDemoData: state.isUsingDemoData,
    _hasHydrated: state._hasHydrated,
  }));

  // Fetch both sets of data, but only one will be used.
  const { data: firestoreProducts, isLoading: isFirestoreLoading, error } = useProducts();
  const { products: demoProducts, locations: demoLocations } = useDemoData();

  // If we are using demo data, return it immediately.
  // The loading state is always false for demo data.
  if (isUsingDemoData) {
    return {
      products: demoProducts,
      locations: demoLocations,
      isLoading: false,
      isHydrated: _hasHydrated,
      error: null,
    };
  }

  // If we are using live data, return the results from the useProducts hook.
  // Note: For a real app, you would also fetch live locations from Firestore here.
  // For this demo, we'll return the demo locations for both cases.
  return {
    products: firestoreProducts,
    locations: demoLocations, // In a real app, this would be live data
    isLoading: isFirestoreLoading,
    isHydrated: _hasHydrated,
    error: error,
  };
}
