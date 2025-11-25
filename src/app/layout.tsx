// src/app/layout.tsx
import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import { Providers } from './providers';
import { AppLayout } from '@/components/AppLayout';
import Chatbot from '@/components/chatbot';
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { demoProducts } from '@/lib/demo/demo-data';
import { cookies } from 'next/headers';
import { DEMO_BRAND_ID } from '@/lib/config';

export const metadata: Metadata = {
  title: 'BakedBot AI',
  description: 'Agentic Commerce OS for Cannabis',
};

// This is now an async function to fetch data for the chatbot
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDemo = cookies().get('isUsingDemoData')?.value === 'true';
  let products = [];
  
  // We fetch product data here to pass down to the global chatbot.
  if (isDemo) {
      products = demoProducts;
  } else {
      try {
          const { firestore } = await createServerClient();
          const productRepo = makeProductRepo(firestore);
          // In a multi-brand scenario, you might pass a specific brandId here.
          // For a global chatbot, we can fetch all or featured products.
          // We'll fetch for the demo brand as a default for now.
          products = await productRepo.getAllByBrand(DEMO_BRAND_ID);
      } catch (error) {
          console.error("Failed to fetch products for chatbot:", error);
          products = demoProducts; // Fallback to demo data on error
      }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <Providers>
            <AppLayout>
                {children}
            </AppLayout>
            <Chatbot products={products} brandId={DEMO_BRAND_ID} />
        </Providers>
      </body>
    </html>
  );
}
