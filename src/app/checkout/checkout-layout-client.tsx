
'use client';

import React, { createContext, useContext } from 'react';
import type { Retailer } from '@/types/domain';

type CheckoutData = {
  locations: Retailer[];
};

const CheckoutDataContext = createContext<CheckoutData | undefined>(undefined);

type CheckoutLayoutClientProps = {
  initialData: CheckoutData;
  children: React.ReactNode;
};

export default function CheckoutLayoutClient({
  initialData,
  children,
}: CheckoutLayoutClientProps) {
  return (
    <CheckoutDataContext.Provider value={initialData}>
      {children}
    </CheckoutDataContext.Provider>
  );
}

export function useCheckoutData() {
  const ctx = useContext(CheckoutDataContext);
  if (!ctx) {
    throw new Error('useCheckoutData must be used within CheckoutLayoutClient');
  }
  return ctx;
}
