
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/providers';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BakedBot AI',
  description: 'Headless menu & AI budtender for cannabis brands',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
