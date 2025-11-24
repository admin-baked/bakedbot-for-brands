// src/app/layout.tsx

import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "BakedBot AI",
  description: "Agentic Commerce OS for cannabis brands.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
