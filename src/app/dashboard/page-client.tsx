'use client';

import * as React from 'react';
import type { Playbook } from '@/types/domain';
import { Bot, ChevronDown, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type DashboardPageClientProps = {
  initialPlaybooks?: Playbook[];
};

type SuggestedPlaybook = {
  name: string;
  description: string;
  agents: string[];
  tags: string[];
};

export default function DashboardPageClient({
  initialPlaybooks,
}: DashboardPageClientProps) {
  const playbooks = initialPlaybooks ?? [];

  const [prompt, setPrompt] = React.useState('');
  const [suggested, setSuggested] = React.useState<SuggestedPlaybook | null>(
    null,
  );

  function handleSuggest(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) {
      setSuggested(null);
      return;
    }

    // SUPER SIMPLE heuristic parser – just to make the UX feel real.
    const lower = trimmed.toLowerCase();
    const agents: string[] = [];
    const tags: string[] = [];

    if (lower.includes('price') || lower.includes('competitor')) {
      agents.push('Ezal', 'Pops');
      tags.push('competitive', 'pricing');
    }
    if (lower.includes('cart') || lower.includes('abandon')) {
      agents.push('Craig', 'Smokey');
      tags.push('retention', 'recovery');
    }
    if (lower.includes('welcome') || lower.includes('subscriber')) {
      agents.push('Craig');
      tags.push('onboarding', 'email');
    }
    if (agents.length === 0) {
      agents.push('Smokey');
    }

    const nameSlug = trimmed
      .slice(0, 40)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    setSuggested({
      name: nameSlug || 'custom-playbook',
      description: trimmed,
      agents: Array.from(new Set(agents)),
      tags: Array.from(new Set(tags)),
    });
  }

  return (
    <div className="space-y-8">
      {/* Heading */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Agent Playbooks
        </h1>
        <p className="text-sm text-muted-foreground">
          This is your AI agent cockpit. Playbooks tell Smokey, Craig, Pops,
          Ezal &amp; friends what to watch and what to do.
        </p>
      </header>

      {/* Build Your AI Agent Workforce */}
      <section className="rounded-2xl border px-4 py-4 md:px-6 md:py-5 bg-background/80 space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">
            Build your AI agent workforce
          </h2>
          <p className="text-xs text-muted-foreground">
            Describe a task, and we&apos;ll turn it into a Playbook that agents
            can run. This is a local preview for now – we&apos;ll wire the AI +
            persistence next.
          </p>
        </div>

        <form onSubmit={handleSuggest} className="flex flex-col gap-2 md:flex-row">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Watch competitor prices in Chicago and alert me when they undercut our 1g vapes."
            className="flex-1 rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 whitespace-nowrap"
          >
            Create draft
          </button>
        </form>

        {suggested && (
          <div className="mt-2 rounded-xl border bg-muted/50 px-3 py-3 text-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold truncate">
                Draft: {suggested.name}
              </div>
              <span className="rounded-full border border-emerald-500/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-50">
                Preview only
              </span>
            </div>
            <p className="text-muted-foreground">{suggested.description}</p>
            <div className="flex flex-wrap gap-1">
              {suggested.agents.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
                >
                  {a}
                </span>
              ))}
              {suggested.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Existing Playbooks list */}
      <section className="space-y-3">
        {list.length > 0 ? (
          <ul className="space-y-3">
            {list.map((pb) => (
              <li
                key={pb.id}
                className="rounded-2xl border px-4 py-4 bg-background/80 text-sm"
              >
                <div className="font-medium">{pb.name}</div>
                {pb.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pb.description}
                  </p>
                )}
                {Array.isArray(pb.tags) && pb.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pb.tags.map((tag) => (
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
          <div className="rounded-xl border p-4 text-sm text-muted-foreground bg-background/80">
            No playbooks to show yet. This is where your agents and automations
            will live once we wire live data.
          </div>
        )}
      </section>
    </div>
  );
}
