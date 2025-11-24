
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
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
          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
