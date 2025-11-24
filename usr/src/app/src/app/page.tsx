
// src/app/page.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12)_0,_transparent_60%),radial-gradient(circle_at_bottom,_rgba(34,197,94,0.08)_0,_transparent_55%)]" />

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 ring-1 ring-emerald-400/40">
              <span className="text-sm font-semibold text-emerald-300">BB</span>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-50">
                BakedBot AI
              </div>
              <div className="text-xs text-slate-400">
                Agentic commerce OS for cannabis
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-4 text-xs sm:text-sm">
            <Link
              href="/product-locator"
              className="rounded-full bg-slate-900/60 px-3 py-1.5 text-slate-200 ring-1 ring-slate-700 hover:bg-slate-800 hover:text-white"
            >
              Product locator demo
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full px-3 py-1.5 text-slate-300 ring-1 ring-slate-600 hover:bg-slate-900 hover:text-white"
            >
              Dashboard
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="mb-14 max-w-3xl space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-xs font-medium text-emerald-200">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Autonomous cannabis commerce, equity-first
          </p>

          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl md:text-5xl">
            Own the customer relationship from discovery to purchase.
          </h1>

          <p className="text-pretty text-sm leading-relaxed text-slate-300 sm:text-base">
            BakedBot AI is a multi-agent OS for cannabis brands and retailers.
            Deploy Smokey, Craig, Deebo & friends to power compliant product
            discovery, pricing, marketing, and loyalty—without handing your
            customers to marketplaces.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/product-locator"
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-emerald-500/40 hover:bg-emerald-400"
            >
              Try the product locator
            </Link>
            <Link
              href="https://bakedbot.ai"
              target="_blank"
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-200 ring-1 ring-slate-600 hover:bg-slate-900"
            >
              Learn more on bakedbot.ai
            </Link>
            <p className="text-xs text-slate-400">
              Compliance-by-design • Headless menus • Brand-first funnels
            </p>
          </div>
        </section>

        {/* Three pillars */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-50">
              Agentic brand OS
            </h2>
            <p className="text-xs leading-relaxed text-slate-300">
              Run a squad of specialized agents—Smokey for menus, Craig for
              email/SMS, Money Mike for margins—all coordinated around your
              brand&apos;s funnel.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-50">
              Compliance by design
            </h2>
            <p className="text-xs leading-relaxed text-slate-300">
              Deebo watches the rules. Every chat, menu, and campaign can be
              pre-flighted against jurisdictional regulations before it ever
              reaches a customer.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-50">
              Headless, SEO-first
            </h2>
            <p className="text-xs leading-relaxed text-slate-300">
              Keep customers on your domains with headless menus and AI
              budtenders that plug into existing stacks instead of replacing
              them.
            </p>
          </div>
        </section>

        {/* Footer-ish */}
        <footer className="mt-auto pt-12 text-[11px] text-slate-500">
          <p>
            Built for cannabis operators who are tired of rented channels and
            invisible algorithms. Plug in agents, not another middleman.
          </p>
        </footer>
      </div>
    </main>
  );
}
