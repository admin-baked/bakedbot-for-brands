// app/page.tsx
import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function BrandsHomepage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 ring-1 ring-emerald-400/40">
              <span className="text-sm font-semibold text-emerald-300">BB</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">BakedBot AI</p>
              <p className="text-[11px] text-slate-400">Headless Menu &amp; AI Budtender</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#features" className="hover:text-slate-50">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-slate-50">
              How it works
            </a>
            <Link href="/menu/default" className="hover:text-slate-50">
              Demo menu
            </Link>
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <Link href="/brand-login" className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-200 hover:border-slate-500">
              Login
            </Link>
            <Link href="/onboarding" className="rounded-full bg-emerald-400 px-4 py-1.5 font-medium text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.75)] hover:bg-emerald-300">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero – AI Budtender widget as the star */}
        <section className="relative overflow-hidden border-b border-slate-800">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_55%)] opacity-90" />

          <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-20 pt-16 md:flex-row md:items-center md:pb-24 md:pt-20">
            <div className="md:w-1/2">
              <p className="mb-3 inline-flex items-center rounded-full border border-emerald-400/40 bg-slate-950/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300">
                New · Headless Menu + AI Budtender
              </p>
              <h1 className="mb-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">
                Keep the customer in your
                <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
                  {" "}
                  brand funnel
                </span>
              </h1>
              <p className="mb-6 max-w-xl text-sm text-slate-300 md:text-base">
                Launch a headless menu with your own AI agent budtender, capture first-party customer data, and route
                compliant orders to partner dispensaries—so shoppers stay in your experience, even when retailers
                fulfill the order.
              </p>

              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Link href="/onboarding" className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.9)] hover:bg-emerald-300">
                  Get started free
                </Link>
                <Link href="/menu/default" className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 hover:border-slate-500">
                  Watch 2-min demo
                </Link>
              </div>

              <p className="text-[11px] text-slate-400">
                Own the customer relationship · Dispensaries still compliantly fulfill the order
              </p>

              <div className="mt-8 flex flex-wrap gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>First-party data · name, email, preferences</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Customers stay on your brand funnel, not a marketplace</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Orders sent via email, tablet, or POS integration</span>
                </div>
              </div>
            </div>

            {/* Hero visual – screenshot of AI Budtender widget */}
            <div className="md:w-1/2">
              <div className="mx-auto max-w-md rounded-3xl border border-slate-200/20 bg-slate-950/40 p-2 shadow-[0_40px_120px_rgba(15,23,42,0.9)]">
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
                  <Image
                    src="https://picsum.photos/seed/budtender/600/800"
                    alt="Headless menu and AI budtender experience"
                    width={600}
                    height={800}
                    className="h-full w-full object-cover"
                    data-ai-hint="chatbot mobile"
                  />
                </div>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-500">
                Example: customers browse products, talk to your AI budtender, and send carts to the dispensary—without
                ever leaving your brand experience.
              </p>
            </div>
          </div>
        </section>

        {/* Feature highlights – Headless Menu & AI Budtender still the main act */}
        <section id="features" className="border-b border-slate-800 bg-slate-950">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
                  Everything your brand needs in one console
                </h2>
                <p className="mt-2 max-w-xl text-sm text-slate-400">
                  Keep products, partners, pricing, and purchasing in sync across your entire footprint—without
                  adding headcount.
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Built for brand owners and portfolio managers who live in spreadsheets today.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">Headless brand menu</p>
                <p className="mt-2 text-sm font-semibold text-slate-50">
                  Own the shopping experience, share the fulfillment
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Embed a shoppable menu anywhere your customers discover you. Capture first-party data while routing
                  orders to partner dispensaries for compliant fulfillment.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">AI agent budtender</p>
                <p className="mt-2 text-sm font-semibold text-slate-50">
                  A digital budtender that never swaps your product
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Guide shoppers to the right SKU with conversational recommendations—before they ever talk to an
                  in-store budtender who might push a competing brand.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">
                  Brand intelligence console
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-50">
                  The mission control for pricing &amp; partners
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Daily menu scans, pricing guardrails, and reorder signals keep your catalog clean and your wholesale
                  relationships humming in the background.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Brand Intelligence Console – moved down from hero */}
        <section className="border-b border-slate-800 bg-slate-950/90" id="how-it-works">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:flex-row md:items-center">
            <div className="md:w-1/2">
              <h3 className="text-lg font-semibold tracking-tight text-slate-50 md:text-xl">
                Brand Intelligence Console: your command center
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                While the headless menu and AI budtender talk to customers, the console watches everything in the
                background—pricing, menu accuracy, and reorder signals—so you can run tighter operations with less
                manual work.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li>• Daily scans of every connected dispensary menu</li>
                <li>• MSRP and pricing guardrails so your brand doesn&apos;t get discounted away</li>
                <li>• Reorder suggestions based on actual retail movement, not guesswork</li>
              </ul>
            </div>

            <div className="md:w-1/2">
              <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_0_60px_rgba(15,23,42,0.9)]">
                <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-200">Brand Intelligence Console</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Agents online
                  </span>
                </div>

                <div className="grid gap-3 text-xs">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Pricing Monitor</p>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                        Live
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-50">37</p>
                        <p className="text-[11px] text-slate-400">menus scanned this morning</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-300">12</p>
                        <p className="text-[11px] text-slate-400">price mismatches flagged</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">Menu Sync</p>
                      <p className="text-sm font-semibold text-slate-50">94% accuracy</p>
                      <p className="text-[11px] text-slate-400">across connected dispensaries</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">Reorder Signals</p>
                      <p className="text-sm font-semibold text-slate-50">18 locations</p>
                      <p className="text-[11px] text-slate-400">predicted to restock this week</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-cyan-400/10 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200">Next action</p>
                      <span className="text-[11px] text-emerald-300">AI suggestion</span>
                    </div>
                    <p className="text-xs text-emerald-50">
                      6 partner dispensaries are low on{" "}
                      <span className="font-semibold">Nebula Nugs 3.5g</span>. Send suggested reorder quantities now?
                    </p>
                    <div className="mt-3 flex gap-2 text-[11px]">
                      <Link href="/dashboard" className="flex-1 rounded-full bg-emerald-400 px-3 py-1 font-semibold text-slate-950 hover:bg-emerald-300 text-center">
                        Review &amp; send orders
                      </Link>
                      <Link href="#" className="rounded-full border border-emerald-300/40 px-3 py-1 text-emerald-100 hover:border-emerald-200">
                        Snooze
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
