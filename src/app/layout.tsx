
import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { AppProviders } from "./app-providers";

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
        <FirebaseClientProvider>
          <AppProviders>
            {children}
            <Toaster />
          </AppProviders>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
