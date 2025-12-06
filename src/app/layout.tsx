// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import React from 'react';
import { Inter, Teko } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppLayout } from '@/components/AppLayout';
import Chatbot from '@/components/chatbot';
import { demoProducts } from '@/lib/demo/demo-data';
import { DEMO_BRAND_ID } from '@/lib/config';
import { SimulationBanner } from '@/components/debug/simulation-banner';

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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BakedBot',
  },
};

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

import { cookies } from 'next/headers';

// ... imports

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const useMockData = cookieStore.get('x-use-mock-data')?.value === 'true';

  // Use demo products if mock data is enabled, otherwise use empty array (or real fetch in future)
  // For now, "Live" means empty/no pre-seeded data, or we could implement a real fetch here.
  const products = useMockData ? demoProducts : [];

  return (
    <html lang="en" className={`${inter.variable} ${teko.variable}`} suppressHydrationWarning>
      <body className="font-sans min-h-screen bg-background text-foreground">
        <Providers>
          <AppLayout>
            {children}
          </AppLayout>
          {/* Conditionally render chatbot with products or empty for live mode */}
          <Chatbot products={products} brandId={DEMO_BRAND_ID} />
          <SimulationBanner />
        </Providers>
      </body>
    </html>
  );
}
