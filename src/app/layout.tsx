// src/app/layout.tsx

import "./globals.css";
import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import { AppLayout } from "@/components/AppLayout";
import type { Metadata } from 'next';


export const metadata: Metadata = {
  title: 'BakedBot AI – Agentic Commerce OS for Cannabis',
  description: 'Autonomous cannabis commerce powered by multi-agent AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-black text-white">
        <Providers>
            <AppLayout>
                {children}
            </AppLayout>
        </Providers>
      </body>
    </html>
  );
}
