
// src/app/dashboard/page.tsx

import { listPlaybooksForBrand, Playbook, seedDemoPlaybooks } from '@/server/repos/playbookRepo';

const FALLBACK_PLAYBOOKS: Playbook[] = [
  {
    id: 'pb-1',
    name: 'Launch Drop · Chicago',
    status: 'active',
    channel: 'Email + SMS',
    runsLast7d: 12,
  },
  {
    id: 'pb-2',
    name: 'Menu SEO · Headless',
    status: 'active',
    channel: 'Smokey · Menu',
    runsLast7d: 34,
  },
  {
    id: 'pb-3',
    name: 'Compliance Watch · IL',
    status: 'paused',
    channel: 'Deebo',
    runsLast7d: 3,
  },
];

const AGENTS = [
  { name: 'Smokey', role: 'Menus + product education', status: 'online' as const },
  { name: 'Craig', role: 'Email + SMS follow-ups', status: 'idle' as const },
  { name: 'Deebo', role: 'Regulation OS + content checks', status: 'watching' as const },
];

export default async function DashboardPage() {
  // 🔧 Temporary hard-coded brand until we thread real brandId through
  const brandId = 'demo-brand';

  let playbooks: Playbook[] = [];

  try {
    // Seed the data first (this is idempotent, it won't duplicate)
    await seedDemoPlaybooks(brandId);
    // Then fetch the data
    playbooks = await listPlaybooksForBrand(brandId);
  } catch (err) {
    console.error('Failed to load playbooks for brand', brandId, err);
  }

  if (!playbooks || playbooks.length === 0) {
    playbooks = FALLBACK_PLAYBOOKS;
  }

  return (
    <div className="space-y-6">
      {/* Top summary row */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Active playbooks
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-50">
              {playbooks.filter((p) => p.status === 'active').length}
            </span>
            <span className="text-[0.7rem] text-slate-400">
              running for this brand
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Playbooks orchestrate your agents across channels. Think “recipes” for
            Smokey, Craig, and friends.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Agent signals · last 7 days
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {/* still static for now; we’ll later compute from events */}
            <span className="text-2xl font-semibold text-slate-50">49</span>
            <span className="text-[0.7rem] text-slate-400">
              automated touchpoints
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Once wired to Firestore, this will pull real events (opens, clicks, menu sessions).
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
              Compliance &amp; health
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <div className="mt-3 text-sm text-emerald-100">
            All content checks passing.
          </div>
          <p className="mt-3 text-xs text-emerald-200/80">
            Deebo is ready to flag menu copy, emails, and ads as we hook more surfaces into
            the Regulation OS.
          </p>
        </div>
      </section>

      {/* Playbooks + Agents */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Playbooks list */}
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">Playbooks</h2>
              <p className="text-xs text-slate-400">
                High-level automations that coordinate agents across channels.
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-100 hover:border-slate-500"
            >
              + New playbook
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {playbooks.map((pb) => (
              <div
                key={pb.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium text-slate-50">
                    {pb.name}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.7rem] text-slate-400">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                      {pb.channel}
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5">
                      {pb.runsLast7d} runs · 7d
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span
                    className={
                      'rounded-full px-2 py-0.5 text-[0.65rem] ' +
                      (pb.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'bg-slate-800 text-slate-400')
                    }
                  >
                    {pb.status === 'active' ? 'Active' : 'Paused'}
                  </span>
                  <button
                    type="button"
                    className="text-[0.7rem] text-slate-400 hover:text-slate-200"
                  >
                    View details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agents status */}
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">Agents</h2>
            <p className="text-xs text-slate-400">
              Quick snapshot of your AI crew.
            </p>
          </div>

          <div className="mt-2 space-y-2 text-xs">
            {AGENTS.map((agent) => (
              <div
                key={agent.name}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2"
              >
                <div>
                  <div className="text-[0.8rem] font-medium text-slate-100">
                    {agent.name}
                  </div>
                  <div className="mt-0.5 text-[0.7rem] text-slate-400">
                    {agent.role}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[0.7rem]">
                  <span
                    className={
                      'h-1.5 w-1.5 rounded-full ' +
                      (agent.status === 'online'
                        ? 'bg-emerald-400'
                        : agent.status === 'watching'
                        ? 'bg-amber-400'
                        : 'bg-slate-500')
                    }
                  />
                  <span className="text-slate-300 capitalize">
                    {agent.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[0.7rem] text-slate-500">
            Later, this panel can pull live status from each agent service
            (queue depth, recent actions, error rate) via Firestore or a
            metrics collection.
          </p>
        </div>
      </section>
    </div>
  );
}
