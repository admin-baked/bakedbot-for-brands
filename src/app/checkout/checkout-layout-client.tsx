'use client';

import type { Retailer } from '@/types/domain';
import { createContext, useContext } from 'react';

interface CheckoutData {
    locations: Retailer[];
}

const CheckoutDataContext = createContext<CheckoutData | null>(null);

export const useCheckoutData = () => {
  const context = useContext(CheckoutDataContext);
  if (!context) {
    throw new Error('useCheckoutData must be used within a CheckoutDataProvider');
  }
  return context;
};

export default function CheckoutLayoutClient({ children, initialData }: { children: React.ReactNode, initialData: CheckoutData }) {
  return (
    <CheckoutDataContext.Provider value={initialData}>
        {children}
    </CheckoutDataContext.Provider>
  );
}
