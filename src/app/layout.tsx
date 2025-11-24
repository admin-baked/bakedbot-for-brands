
// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Inter, Teko } from 'next/font/google';
import { Providers } from '@/providers';
import { cn } from '@/lib/utils';
import AppThemeProvider from '@/components/AppThemeProvider';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'BakedBot AI',
  description: 'BakedBot AI – Agentic Commerce OS for Cannabis',
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const teko = Teko({
  subsets: ['latin'],
  variable: '--font-teko',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(inter.variable, teko.variable, 'green')} suppressHydrationWarning>
      <body className="font-sans min-h-screen flex flex-col bg-background text-foreground">
        <Providers>
            <AppThemeProvider>
                <div className="flex-1 flex flex-col">
                  <Header />
                  <div className="flex-1">{children}</div>
                  <Footer />
                </div>
            </AppThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
