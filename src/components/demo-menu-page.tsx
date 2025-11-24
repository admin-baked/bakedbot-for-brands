
"use client";

import * as React from "react";

type DemoMenuPageProps = {
  brandId?: string;
};

export function DemoMenuPage({ brandId }: DemoMenuPageProps) {
  // We’re not using brandId yet, but we accept it
  return (
    <div className="p-6 space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Demo Menu</h1>
      <p className="text-sm text-muted-foreground">
        The old menu demo is temporarily disabled while we ship the new
        headless menu + Smokey experience.
      </p>
      {brandId && (
        <p className="text-xs text-muted-foreground">
          Brand ID: <code>{brandId}</code>
        </p>
      )}
    </div>
  );
}
