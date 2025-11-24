
// src/app/dashboard/page-client.tsx
"use client";

import * as React from "react";

type DashboardPageClientProps = {
  brandId: string;
  initialPlaybooks?: any[];
};

export default function DashboardPageClient({
  brandId,
  initialPlaybooks,
}: DashboardPageClientProps) {
  const [list, setList] = React.useState<any[]>(initialPlaybooks ?? []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Dashboard for {brandId}</h1>

      <section className="space-y-2">
        {list && list.length > 0 ? (
          <ul className="space-y-2">
            {list
              .filter(Boolean)
              .map((pb: any, idx: number) => {
                const id = pb?.id ?? idx;
                const name = pb?.name ?? "Untitled playbook";
                const description = pb?.description ?? "";

                return (
                  <li
                    key={id}
                    className="rounded-xl border p-3 text-sm flex justify-between"
                  >
                    <div>
                      <div className="font-medium">{name}</div>
                      {description && (
                        <p className="text-xs text-muted-foreground">
                          {description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        ) : (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            No playbooks yet. Time to teach Craig some tricks.
          </div>
        )}
      </section>
    </div>
  );
}
