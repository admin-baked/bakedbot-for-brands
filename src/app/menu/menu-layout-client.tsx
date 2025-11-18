// src/app/menu/menu-layout-client.tsx
'use client';

import { useHydrated } from '@/hooks/use-hydrated';
import { useCookieStore } from '@/lib/cookie-storage';
import { useEffect } from 'react';
import type { Product, Retailer, Review } from '@/types/domain';

interface MenuData {
    brandId: string;
    products: Product[];
    locations: Retailer[];
    reviews: Review[];
    featuredProducts: Product[];
    isDemo: boolean;
}

// This is a new context to provide the server-fetched data to all client components in this layout.
import { createContext, useContext } from 'react';

const MenuDataContext = createContext<MenuData | null>(null);

export const useMenuData = () => {
  const context = useContext(MenuDataContext);
  if (!context) {
    throw new Error('useMenuData must be used within a MenuDataProvider');
  }
  return context;
};


export default function MenuLayoutClient({ children, initialData }: { children: React.ReactNode, initialData: MenuData }) {
  const { setIsDemo } = useCookieStore();
  const hydrated = useHydrated();

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
