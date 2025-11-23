// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/providers';
import Header from '@/components/header';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'BakedBot AI',
  description: 'BakedBot AI – Agentic Commerce OS for Cannabis',
};

const isDevBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
         {isDevBypass && (
          <div className="w-full bg-yellow-400 text-black text-center text-sm py-1 font-semibold">
            DEV AUTH BYPASS ENABLED
          </div>
        )}
        <Providers>
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
            </div>
        </Providers>
      </body>
    </html>
  );
}
