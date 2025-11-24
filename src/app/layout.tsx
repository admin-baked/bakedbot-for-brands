
import type { ReactNode } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Providers } from "@/app/providers";
import "./globals.css";

export const metadata = {
  title: "BakedBot AI",
  description: "Agentic Commerce OS for cannabis brands.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
