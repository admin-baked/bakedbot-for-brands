// src/app/layout.tsx
import type { Metadata } from 'next';
import React from 'react';
import { Inter, Teko } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppLayout } from '@/components/AppLayout';
import Chatbot from '@/components/chatbot';
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { demoProducts } from '@/lib/demo/demo-data';
import { cookies } from 'next/headers';
import { DEMO_BRAND_ID } from '@/lib/config';

import { logger } from '@/lib/logger';
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const teko = Teko({
  subsets: ['latin'],
  variable: '--font-teko',
  weight: ['400', '700'],
});


export const metadata: Metadata = {
  title: 'BakedBot AI',
  description: 'Agentic Commerce OS for Cannabis',
  manifest: '/manifest.json',
  themeColor: '#10b981',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BakedBot',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
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
      logger.error("Failed to fetch products for chatbot:", error);
      products = demoProducts; // Fallback to demo data on error
    }
  }

  return (
    <html lang="en" className={`${inter.variable} ${teko.variable}`} suppressHydrationWarning>
      <body className="font-sans min-h-screen bg-background text-foreground">
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
