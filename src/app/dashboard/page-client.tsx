"use client";

import * as React from "react";

type DashboardPageClientProps = {
  initialPlaybooks?: any[];
};

export default function DashboardPageClient({
  initialPlaybooks = [],
}: DashboardPageClientProps) {
  // Local state if you ever want to add client-side mutations (filtering, etc.)
  const [list, setList] = React.useState<any[]>(initialPlaybooks);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Playbooks Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your automations, experiments, and agent workflows here.
        </p>
      </header>

      {/* Existing Playbooks list */}
      <section className="space-y-3">
        {list.length > 0 ? (
          <ul className="space-y-3">
            {list.map((pb: any, idx: number) => (
              <li
                key={pb.id ?? pb.slug ?? idx}
                className="rounded-xl border p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {pb.name ?? "Untitled playbook"}
                    </div>
                    {pb.description && (
                      <p className="text-xs text-muted-foreground">
                        {pb.description}
                      </p>
                    )}
                  </div>
                  {pb.status && (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {pb.status}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            No playbooks yet. Start by creating your first automation to watch
            competitors, rescue abandoned carts, or trigger loyalty flows.
          </div>
        )}
      </section>
    </div>
  );
}
