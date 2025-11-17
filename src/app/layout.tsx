
import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from './providers';
import { FirebaseRoot } from "./firebase-root";
import Header from "@/components/header";
import { Footer } from "@/components/footer";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "BakedBot - Headless Cannabis Commerce AI Agent",
  description: "A headless menu and AI-powered budtender for cannabis dispensaries and brands.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <FirebaseRoot>
          <Providers>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </Providers>
        </FirebaseRoot>
        <Toaster />
      </body>
    </html>
  );
}
