// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Inter, Teko } from 'next/font/google';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'BakedBot AI',
  description: 'BakedBot AI – Agentic Commerce OS for Cannabis',
};

// Base body font
const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

// Optional display font for headings
const fontDisplay = Teko({
  subsets: ['latin'],
  variable: '--font-teko',
  weight: ['300', '400', '500', '600', '700'],
});


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "min-h-screen bg-background font-sans antialiased",
        fontSans.variable,
        fontDisplay.variable
      )}
    >
      <body className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
