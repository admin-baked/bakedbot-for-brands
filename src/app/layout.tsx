import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
