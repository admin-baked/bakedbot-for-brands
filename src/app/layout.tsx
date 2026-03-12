// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import React from 'react';
import { cookies, headers } from 'next/headers';
import './globals.css';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Providers } from './providers';
import { AppLayout } from '@/components/AppLayout';
import GlobalChatbot from '@/components/global-chatbot';
import { demoProducts } from '@/lib/demo/demo-data';
import { SimulationBanner } from '@/components/debug/simulation-banner';
import { GoogleAnalytics } from '@/components/analytics/google-analytics';

const ANDREWS_HOST = 'andrewsdevelopments.bakedbot.ai';

function normalizeHost(value: string | null) {
  return (value || '').replace(/:\d+$/, '').toLowerCase();
}

async function getRequestHost() {
  const headerStore = await headers();
  return normalizeHost(headerStore.get('x-forwarded-host') || headerStore.get('host'));
}

export async function generateMetadata(): Promise<Metadata> {
  const host = await getRequestHost();

  if (host === ANDREWS_HOST) {
    return {
      title: 'Andrews Developments',
      description: 'Modern homes. Strong community. A brighter future in Robbins, Illinois.',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Andrews Developments',
      },
    };
  }

  return {
    title: 'BakedBot AI',
    description: 'The first cannabis commerce platform built for both the human web and the agent web.',
    manifest: '/manifest.json',
    icons: {
      icon: '/assets/agents/smokey-main.png',
      shortcut: '/assets/agents/smokey-main.png',
      apple: '/assets/agents/smokey-main.png',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'BakedBot',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#10b981',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// ... imports

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cookieStore, host] = await Promise.all([cookies(), getRequestHost()]);
  const isAndrewsHost = host === ANDREWS_HOST;
  const useMockData = cookieStore.get('x-use-mock-data')?.value === 'true';

  // Use demo products if mock data is enabled, otherwise use empty array (or real fetch in future)
  // For now, "Live" means empty/no pre-seeded data, or we could implement a real fetch here.
  const products = useMockData ? demoProducts : [];

  if (isAndrewsHost) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className="font-sans min-h-screen bg-background text-foreground" suppressHydrationWarning>
          <GoogleAnalytics />
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans min-h-screen bg-background text-foreground" suppressHydrationWarning>
        <Providers>
          <AppLayout>
            <GoogleAnalytics />
            {children}
          </AppLayout>
          {/* Global chatbot - disabled on dashboard, which owns its own support/test surfaces */}
          <GlobalChatbot products={products} />
          <SimulationBanner />
        </Providers>
      </body>
    </html>
  );
}
