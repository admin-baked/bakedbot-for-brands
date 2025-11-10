
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { CartProvider } from '@/hooks/use-cart';
import { ThemeProvider } from '@/components/theme-provider';
import { CartSheet } from '@/components/cart-sheet';

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
          <FirebaseClientProvider>
            <CartProvider>
              {children}
              <CartSheet />
              <Toaster />
            </CartProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
