
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav';
import { cn } from '@/lib/utils'; // assuming you already have a cn helper

// Simple icon placeholder – swap with lucide-react later
function DotIcon({ active }: { active?: boolean }) {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        active ? 'bg-emerald-400' : 'bg-zinc-600'
      )}
    />
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-800 bg-[#121015] text-zinc-100">
      {/* Brand header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-zinc-800">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-xs font-black">
          BB
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">
            BakedBot.AI
          </span>
          <span className="text-[11px] text-zinc-400">
            Agentic Commerce OS
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-6 text-sm">
        <NavGroup
          title="Workspace"
          items={DASHBOARD_NAV_ITEMS.filter((i) => i.group === 'core')}
          pathname={pathname}
        />

        <NavGroup
          title="Growth"
          items={DASHBOARD_NAV_ITEMS.filter((i) => i.group === 'growth')}
          pathname={pathname}
        />

        <NavGroup
          title="Lifecycle"
          items={DASHBOARD_NAV_ITEMS.filter((i) => i.group === 'lifecycle')}
          pathname={pathname}
        />

        <NavGroup
          title="Settings"
          items={DASHBOARD_NAV_ITEMS.filter((i) => i.group === 'settings')}
          pathname={pathname}
        />
      </nav>

      {/* Account footer */}
      <div className="border-t border-zinc-800 p-3 text-xs text-zinc-400 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium text-zinc-200">Martez Knox</span>
          <span className="text-[11px] text-zinc-500">Founder · Brand view</span>
        </div>
        <DotIcon active />
      </div>
    </aside>
  );
}

type NavGroupProps = {
  title: string;
  items: typeof DASHBOARD_NAV_ITEMS;
  pathname: string | null;
};

function NavGroup({ title, items, pathname }: NavGroupProps) {
  if (!items.length) return null;

  return (
    <div className="space-y-1">
      <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'group flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-xs transition-colors',
                active
                  ? 'bg-zinc-800 text-zinc-50'
                  : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-50'
              )}
            >
              <span className="flex items-center gap-2">
                <DotIcon active={active} />
                <span className="truncate">{item.label}</span>
              </span>

              {item.badge === 'beta' && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                  BETA
                </span>
              )}
              {item.badge === 'locked' && (
                <span className="rounded-full bg-zinc-700/60 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-300">
                  LOCKED
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
