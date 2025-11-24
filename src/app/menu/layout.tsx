import * as React from "react";

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Minimal layout: just render children. You can reintroduce
  // menu-specific providers or props later once things are stable.
  return <>{children}</>;
}
