
import type { ReactNode } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.Node;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-60 flex-col border-r border-slate-800 bg-slate-950/80 px-4 py-6 md:flex">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              BakedBot AI
            </div>
            <div className="mt-1 text-sm text-slate-300">
              Operator console
            </div>
          </div>

          <nav className="space-y-1 text-sm">
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Overview
            </div>
            <div className="mt-1 space-y-1">
              <span className="flex items-center justify-between rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 ring-1 ring-slate-700">
                <span>Dashboard</span>
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[0.65rem] text-emerald-300">
                  live
                </span>
              </span>
            </div>

            <div className="mt-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Agents
            </div>
            <div className="mt-1 space-y-1 text-xs text-slate-400">
              <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-slate-900/60">
                <span>Smokey · Menus</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-slate-900/60">
                <span>Craig · Email/SMS</span>
              </div>
              <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-slate-900/60">
                <span>Deebo · Compliance</span>
              </div>
            </div>
          </nav>

          <div className="mt-auto pt-6 text-[0.7rem] text-slate-500">
            Equity-first • Headless • Compliant
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-sm font-semibold text-slate-50">
                  Brand dashboard
                </h1>
                <p className="text-xs text-slate-400">
                  Monitor playbooks, agents, and performance in one place.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[0.7rem] text-slate-400">
                <span className="hidden rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300 sm:inline">
                  Deebo watching regs
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Synced</span>
              </div>
            </div>
          </header>

          <main className="px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
