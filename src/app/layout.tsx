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

// This is now an async function to fetch data for the chatbot
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use demo products for the global chatbot to avoid 500 errors
  // Individual pages can fetch their own data as needed
  const products = demoProducts;

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
