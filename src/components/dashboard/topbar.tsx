
// src/components/dashboard/topbar.tsx
import type { ReactNode } from 'react';

type Props = {
  children?: ReactNode;
};

export function DashboardTopbar({ children }: Props) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-[#141218] px-5">
      <div className="flex flex-col">
        <p className="text-xs font-semibold text-emerald-400">
          Good evening, Playbooks!
        </p>
        <p className="text-[11px] text-zinc-400">
          Your Friday quote: “Every time I come in the kitchen…”
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs text-zinc-300">
        {/* Demo vs Live toggle stub */}
        <div className="flex items-center gap-1 rounded-full border border-zinc-700 px-2 py-1">
          <span className="text-[11px] uppercase tracking-[0.12em] text-zinc-400">
            Mode
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300">
            Demo
          </span>
        </div>

        {/* Placeholder for future actions (search, notifications, profile, etc.) */}
        {children}
      </div>
    </header>
  );
}
