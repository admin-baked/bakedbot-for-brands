
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { CartProvider } from '@/hooks/use-cart';
import { ThemeProvider } from '@/components/theme-provider';
import { CartSheet } from '@/components/cart-sheet';
import { DemoModeProvider } from '@/context/demo-mode';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BakedBot - Headless Cannabis Commerce AI Agent',
  description:
    'A headless menu and AI-powered budtender for cannabis dispensaries.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <DemoModeProvider>
            <FirebaseClientProvider>
              <CartProvider>
                {children}
                <CartSheet />
                <Toaster />
              </CartProvider>
            </FirebaseClientProvider>
          </DemoModeProvider>
        </ThemeProvider>
        <Script src="/sw-installer.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
