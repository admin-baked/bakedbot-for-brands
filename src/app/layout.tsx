// src/app/layout.tsx

import "./globals.css";
import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import { AppLayout } from "@/components/AppLayout";


export const metadata = {
  title: "BakedBot AI",
  description: "Agentic Commerce OS for cannabis brands.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
            <AppLayout>
                {children}
            </AppLayout>
        </Providers>
      </body>
    </html>
  );
}
