
'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { StoreProvider, useStore } from '@/hooks/use-store';
import { useEffect } from 'react';
import { themes } from '@/lib/themes';
import { FirebaseClientProvider } from '@/firebase';
import { CartProvider } from '@/hooks/use-cart';

export default function RootLayoutWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <StoreProvider>
      <FirebaseClientProvider>
        <CartProvider>
          <RootLayout>{children}</RootLayout>
        </CartProvider>
      </FirebaseClientProvider>
    </StoreProvider>
  );
}

function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    const selectedTheme = themes.find((t) => t.name === theme);
    if (selectedTheme) {
      const root = document.documentElement;
      Object.entries(selectedTheme.cssVars.light).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
      document.body.classList.remove(...themes.map(t => `theme-${t.name}`));
      document.body.classList.add(`theme-${theme}`);
    }
  }, [theme]);


  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>BakedBot AI Assistant</title>
        <meta name="description" content="AI Assistant for Dispensaries" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
         <link
          href="https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
