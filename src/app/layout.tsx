
'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { StoreProvider, useStore } from '@/hooks/use-store';
import { useEffect } from 'react';
import { themes } from '@/lib/themes';
import { FirebaseClientProvider } from '@/firebase';

export default function RootLayoutWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <StoreProvider>
      <FirebaseClientProvider>
        <RootLayout>{children}</RootLayout>
      </FirebaseClientProvider>
    </StoreProvider>
  );
}

function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { theme } = useStore();

  useEffect(() => {
    const selectedTheme = themes.find((t) => t.name === theme);
    if (selectedTheme) {
      const root = document.documentElement;
      Object.entries(selectedTheme.cssVars.light).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });
      // The dark theme variables are not dynamically set here, assuming they are in globals.css
      // or handled separately if dynamic dark themes are needed.
      // If you want to support dynamic dark themes, you would do:
      // Object.entries(selectedTheme.cssVars.dark).forEach(([key, value]) => {
      //   root.style.setProperty(`--dark-${key}`, value); // Or however you structure dark vars
      // });
      
      // For simplicity, this example just switches between predefined light themes
      // and assumes a single dark theme defined in globals.css
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
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
