// app/layout.tsx
import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { Providers } from "@/app/providers";
import Header from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "BakedBot Studio",
  description: "Headless menu + AI budtender",
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
            <main className="flex-1">
                {children}
            </main>
            <Footer />
        </Providers>
      </body>
    </html>
  );
}
