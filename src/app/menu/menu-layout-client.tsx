
'use client';

import { useHydrated } from '@/hooks/use-hydrated';
import { useCookieStore } from '@/lib/cookie-storage';
import { useEffect } from 'react';
import type { Product, Retailer, Review } from '@/types/domain';
import { useDemoMode } from '@/context/demo-mode';

// Define the shape of the data that will be passed from the server.
interface MenuData {
    brandId: string;
    products: Product[];
    locations: Retailer[];
    reviews: Review[];
    featuredProducts: Product[];
    isDemo: boolean;
}

// Create a new context to provide the server-fetched data to all client components in this layout.
import { createContext, useContext } from 'react';

const MenuDataContext = createContext<MenuData | null>(null);

/**
 * A hook to easily access the menu data from any child client component.
 */
export const useMenuData = () => {
  const context = useContext(MenuDataContext);
  if (!context) {
    throw new Error('useMenuData must be used within a MenuDataProvider');
  }
  return context;
};

/**
 * This client component receives the data fetched on the server and provides it
 * to all its children via context. It also synchronizes the `isDemo` state
 * with the cookie-based store.
 */
export default function MenuLayoutClient({ children, initialData }: { children: React.ReactNode, initialData: MenuData }) {
  const { setIsDemo } = useDemoMode();
  const hydrated = useHydrated();

  // Effect to sync the server-determined demo status with the client-side cookie store.
  useEffect(() => {
    if (hydrated) {
        setIsDemo(initialData.isDemo);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData.isDemo, hydrated]);

  return (
    <MenuDataContext.Provider value={initialData}>
        {children}
    </MenuDataContext.Provider>
  );
}
