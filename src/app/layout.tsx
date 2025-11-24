// src/app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import { Inter, Teko } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Providers } from '@/app/providers';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { FloatingCartPill } from '@/components/floating-cart-pill';

export const metadata = {
  title: 'BakedBot AI',
  description: 'Agentic Commerce OS for cannabis brands.',
};

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const fontDisplay = Teko({
  subsets: ['latin'],
  variable: '--font-teko',
  weight: ['400', '700'],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', fontSans.variable, fontDisplay.variable)}>
        <Providers>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <div className="flex-1">{children}</div>
              <Footer />
            </div>
            <FloatingCartPill />
        </Providers>
      </body>
    </html>
  );
}
