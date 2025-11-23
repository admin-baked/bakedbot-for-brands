
// app/dashboard/page.tsx
'use client';

import { useState } from 'react';

type PlaybookKind = 'signal' | 'automation';

type PlaybookStatusFilter = 'all' | 'active' | 'disabled';

type Playbook = {
  id: string;
  name: string;
  kind: PlaybookKind;
  tags: string[];
  enabled: boolean;
};

const initialPlaybooks: Playbook[] = [
  {
    id: 'abandon-browse-cart-saver',
    name: 'abandon-browse-cart-saver',
    kind: 'signal',
    tags: ['retention', 'recovery', 'sms', 'email', 'on-site'],
    enabled: true,
  },
  {
    id: 'competitor-price-drop-watch',
    name: 'competitor-price-drop-watch',
    kind: 'signal',
    tags: ['competitive', 'pricing', 'experiments'],
    enabled: true,
  },
  {
    id: 'new-subscriber-welcome-series',
    name: 'new-subscriber-welcome-series',
    kind: 'automation',
    tags: ['email', 'onboarding', 'engagement'],
    enabled: false,
  },
  {
    id: 'win-back-lapsed-customers',
    name: 'win-back-lapsed-customers',
    kind: 'signal',
    tags: ['retention', 'sms', 'discounts'],
    enabled: true,
  },
];

export default function DashboardPage() {
  const [playbooks, setPlaybooks] = useState(initialPlaybooks);
  const [statusFilter, setStatusFilter] =
    useState<PlaybookStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlaybooks = playbooks.filter((pb) => {
    if (statusFilter === 'active' && !pb.enabled) return false;
    if (statusFilter === 'disabled' && pb.enabled) return false;
    if (
      searchTerm &&
      !pb.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleToggle = (id: string) => {
    setPlaybooks((prev) =>
      prev.map((pb) =>
        pb.id === id ? { ...pb, enabled: !pb.enabled } : pb,
      ),
    );
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Left sidebar */}
      <aside className="w-60 bg-muted border-r border-border/5 flex flex-col">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border/5">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
            B
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-sm">BakedBot.AI</span>
            <span className="text-[10px] text-primary font-semibold">
              BETA
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1 text-sm">
          <NavItem label="Dashboard" active />
          <NavItem label="Knowledge Base" />
          <NavItem label="Smokey Growth Engine" />
          <NavItem label="Campaigns" locked />
          <NavItem label="Playbooks" />
        </nav>

        <div className="px-3 pb-4 space-y-3">
          <div className="bg-gradient-to-br from-purple-700/80 via-primary/70 to-amber-400/70 rounded-xl p-3 text-xs">
            <div className="font-semibold mb-1">Upgrade your plan!</div>
            <p className="text-[11px] mb-2">
              Unlock more agents, experiments, and premium support.
            </p>
            <button className="w-full rounded-lg bg-black/70 text-[11px] py-1.5 font-medium hover:bg-black text-primary-foreground/90">
              View Plans
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs px-1">
            <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[11px] text-secondary-foreground">
              MK
            </div>
            <div className="flex-1">
              <div className="font-medium truncate">Martez Knox</div>
              <div className="text-[10px] text-muted-foreground">
                Brand Owner (Dev)
              </div>
            </div>
            <button className="text-[10px] text-muted-foreground hover:text-foreground">
              ⏏
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 border-b border-border/5 flex items-center justify-between px-6 bg-card">
          <div className="flex flex-col justify-center">
            <div className="text-xs text-muted-foreground">
              Good evening, Melanie!
            </div>
            <div className="text-[11px] text-muted-foreground/80 truncate max-w-md">
              Your Friday quote: &quot;Every time I come in the kitchen, you
              in the kitchen. In the goddamn...&quot;
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="relative">
              <input
                type="text"
                placeholder="Search everything…"
                className="bg-muted border border-border rounded-full pl-8 pr-3 py-1.5 text-[11px] focus:outline-none focus:border-primary/70 placeholder:text-muted-foreground min-w-[200px]"
              />
              <span className="absolute left-2 top-1.5 text-muted-foreground text-xs">
                🔍
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-primary font-medium">
                Live Mode
              </span>
              <ToggleSwitch checked />
            </div>

            <button className="px-1.5 py-0.5 rounded-full border border-border/10 text-[10px]">
              EN
            </button>
            <button className="px-1.5 py-0.5 rounded-full border border-transparent text-[10px] text-muted-foreground">
              ES
            </button>

            <button className="text-lg">🌙</button>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
          <section className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-semibold">
              Good evening, Playbooks
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Describe a task, and Smokey will build an autonomous agent
              to handle it for you.
            </p>
          </section>

          {/* Build your AI Agent Workforce */}
          <section className="bg-card border border-border/10 rounded-2xl px-6 py-5 flex flex-col gap-3">
            <div className="flex justify-between items-center gap-4">
              <div className="space-y-1">
                <div className="text-xs tracking-wide text-primary flex items-center gap-1">
                  <span className="text-sm">⚡</span>
                  <span className="uppercase">Build Your AI Agent Workforce</span>
                </div>
                <p className="text-[11px] text-muted-foreground max-w-lg">
                  Type what you want your agents to do. Smokey will propose
                  a Playbook and let you review before going live.
                </p>
              </div>
              <button className="hidden md:inline-flex items-center justify-center rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                Create Agent
              </button>
            </div>

            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-primary text-xs">
                  🧠
                </span>
                <input
                  type="text"
                  placeholder="e.g., Send a daily summary of cannabis industry news to my email."
                  className="w-full bg-background/30 border border-border rounded-lg pl-7 pr-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary/70"
                />
              </div>
              <button className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 md:hidden">
                Create
              </button>
            </div>
          </section>

          {/* Filters + Playbooks list */}
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search playbooks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-card border border-border/10 rounded-lg px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:border-primary/70"
                />
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Status:</span>
                  <FilterChip
                    label="All"
                    active={statusFilter === 'all'}
                    onClick={() => setStatusFilter('all')}
                  />
                  <FilterChip
                    label="Active"
                    active={statusFilter === 'active'}
                    onClick={() => setStatusFilter('active')}
                  />
                  <FilterChip
                    label="Disabled"
                    active={statusFilter === 'disabled'}
                    onClick={() => setStatusFilter('disabled')}
                  />
                </div>
                <button className="px-3 py-1 rounded-lg bg-card border border-border/10 text-xs font-medium hover:border-primary/70">
                  Create Manually
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {filteredPlaybooks.map((pb) => (
                <PlaybookCard
                  key={pb.id}
                  playbook={pb}
                  onToggle={() => handleToggle(pb.id)}
                />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

/* --- Small components --- */

function NavItem({
  label,
  active,
  locked,
}: {
  label: string;
  active?: boolean;
  locked?: boolean;
}) {
  return (
    <button
      className={[
        'w-full flex items-center justify-between rounded-lg px-3 py-2 text-left',
        active
          ? 'bg-foreground/5 text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
      ].join(' ')}
    >
      <span className="truncate">{label}</span>
      {locked && (
        <span className="text-[11px] text-muted-foreground/80 ml-2">🔒</span>
      )}
    </button>
  );
}

function ToggleSwitch({ checked }: { checked: boolean }) {
  return (
    <div
      className={[
        'w-9 h-4 rounded-full flex items-center px-0.5 transition-colors',
        checked ? 'bg-primary' : 'bg-secondary',
      ].join(' ')}
    >
      <div
        className={[
          'w-3 h-3 rounded-full bg-primary-foreground shadow transform transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-2.5 py-1 rounded-full text-[11px] border',
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-transparent border-border/10 text-muted-foreground hover:border-primary/70 hover:text-foreground',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function PlaybookCard({
  playbook,
  onToggle,
}: {
  playbook: Playbook;
  onToggle: () => void;
}) {
  const kindLabel =
    playbook.kind === 'signal' ? 'SIGNAL' : 'AUTOMATION';

  return (
    <article className="bg-card border border-border/10 rounded-2xl px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between text-[11px]">
        <button className="inline-flex items-center gap-1 text-foreground">
          <span className="uppercase tracking-wide">
            {kindLabel}
          </span>
          <span className="text-[9px] text-muted-foreground">▾</span>
        </button>
        <button onClick={onToggle}>
          <ToggleSwitch checked={playbook.enabled} />
        </button>
      </div>

      <div className="text-sm font-semibold break-words">
        {playbook.name}
      </div>

      <div className="flex flex-wrap gap-1 mt-1">
        {playbook.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/80"
          >
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
