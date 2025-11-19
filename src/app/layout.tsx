
import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import Header from "@/components/header";
import { Footer } from "@/components/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider } from "@/firebase/client-provider";

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
      <body>
        <FirebaseClientProvider>
            <ThemeProvider>
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
            </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
