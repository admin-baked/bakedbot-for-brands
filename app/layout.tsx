
import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import Header from "@/components/header";
import { Footer } from "@/components/footer";
import { Providers } from "@/app/providers";

export const metadata: Metadata = {
  title: "BakedBot AI",
  description: "Headless menu & AI budtender for cannabis brands",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Providers>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
        </Providers>
      </body>
    </html>
  );
}
