// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Inter, Teko } from 'next/font/google';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Providers } from '@/providers';

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
    <html lang="en" className={`${inter.variable} ${teko.variable}`}>
      <body className="font-sans min-h-screen flex flex-col">
        <Providers>
          <Header />
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
