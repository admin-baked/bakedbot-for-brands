
'use client';

import * as React from 'react';
import type { Playbook } from '@/types/domain';

type DashboardPageClientProps = {
  initialPlaybooks?: Playbook[];
};

export default function DashboardPageClient({ initialPlaybooks }: DashboardPageClientProps) {
  const playbooks = initialPlaybooks ?? [];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Agent Playbooks
        </h1>
        <p className="text-sm text-muted-foreground">
          This is your AI agent cockpit. Playbooks tell Smokey, Craig, Pops,
          Ezal & friends what to watch and what to do.
        </p>
      </header>

      {playbooks.length > 0 ? (
        <ul className="space-y-2">
          {playbooks.map((pb: any, idx: number) => (
            <li
              key={pb.id ?? pb.slug ?? idx}
              className="rounded-xl border p-4 text-sm bg-background"
            >
              <div className="font-medium">
                {pb.name ?? 'Untitled playbook'}
              </div>
              {pb.description && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {pb.description}
                </p>
              )}
              {Array.isArray(pb.tags) && pb.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {pb.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground bg-background">
          No playbooks to show yet. This is where your agents and automations
          will live once we wire live data.
        </div>
      )}
    </div>
  );
}
