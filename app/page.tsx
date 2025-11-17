
import Link from "next/link";

export default function Home() {
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
              <p className="text-[11px] text-slate-400">Brand Intelligence Console</p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#features" className="hover:text-emerald-300">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-emerald-300">
              How it works
            </a>
            <Link
              href="/menu/default"
              className="hover:text-emerald-300"
            >
              Demo menu
            </Link>
            <a href="#pricing" className="hover:text-emerald-300">
              Pricing
            </a>
            <a href="#for-dispensaries" className="hover:text-emerald-300">
              For dispensaries
            </a>
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <Link href="/customer-login" className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-200 hover:border-slate-500">
              Login
            </Link>
            <Link href="/onboarding" className="rounded-full bg-emerald-400 px-4 py-1.5 font-medium text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.75)] hover:bg-emerald-300">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-slate-800">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_55%)] opacity-90" />

          <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-20 pt-16 md:flex-row md:items-center md:pb-28 md:pt-20">
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
                Launch a headless menu with your own AI agent budtender, capture first-party customer data,
                and route compliant orders to partner dispensaries—while the Brand Intelligence Console keeps
                prices and menus in sync.
              </p>

              <div className="mb-3 flex flex-wrap items-center gap-3">
                <Link href="/onboarding" className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.9)] hover:bg-emerald-300">
                  Get started free
                </Link>
                <Link href="/menu/default" className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 hover:border-slate-500">
                  Watch 2-min demo
                </Link>
              </div>
              <p className="mb-2 text-[11px] text-slate-400">
                Own the customer relationship · Dispensaries still compliantly fulfill the order
              </p>
              <p className="text-[11px] text-emerald-300">
                Want to see it in action?{" "}
                <Link
                  href="/menu/default"
                  className="underline underline-offset-2 hover:text-emerald-200"
                >
                  Open the demo menu
                </Link>
                .
              </p>

              <div className="mt-8 flex flex-wrap gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>First-party data · name, email, preferences</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Customers stay on your brand experience</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Orders sent via email, tablet, or POS integration</span>
                </div>
              </div>
            </div>

            {/* Hero panel mock */}
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
                      <button className="flex-1 rounded-full bg-emerald-400 px-3 py-1 font-semibold text-slate-950 hover:bg-emerald-300">
                        Review &amp; send orders
                      </button>
                      <button className="rounded-full border border-emerald-300/40 px-3 py-1 text-emerald-100 hover:border-emerald-200">
                        Snooze
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature highlights */}
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
                  Embed a shoppable menu anywhere your customers discover you. Capture first-party data while
                  routing orders to partner dispensaries for compliant fulfillment.
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
                  Daily menu scans, pricing guardrails, and reorder signals keep your catalog clean and your
                  wholesale relationships humming in the background.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-b border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900"
        >
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <div className="mb-8 text-center">
              <h2 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
                From chaos to control in four steps
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Launch your brand console in under a day, then let the agents handle the tedious work.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className="relative flex flex-col rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300">
                      {step}
                    </span>
                    <span className="text-[11px] text-slate-500">Setup</span>
                  </div>
                  {step === 1 && (
                    <>
                      <p className="text-sm font-semibold text-slate-50">Import your products</p>
                      <p className="mt-2 text-xs text-slate-400">
                        Upload your catalog or connect your existing menu. We normalize SKUs, variants, and lab data.
                      </p>
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <p className="text-sm font-semibold text-slate-50">Add &amp; claim dispensaries</p>
                      <p className="mt-2 text-xs text-slate-400">
                        Link every partner location. Dispensary owners can claim their page for shared control.
                      </p>
                    </>
                  )}
                  {step === 3 && (
                    <>
                      <p className="text-sm font-semibold text-slate-50">Deploy your headless menu</p>
                      <p className="mt-2 text-xs text-slate-400">
                        Turn your catalog into a shoppable, brand-owned menu that can live on your site, landing
                        pages, QR codes, and campaigns.
                      </p>
                    </>
                  )}
                  {step === 4 && (
                    <>
                      <p className="text-sm font-semibold text-slate-50">
                        Start sending orders &amp; collecting data
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Route orders to retailers via email, tablet, or POS—and capture first-party data like what
                        they bought, name, email, and phone so you can market directly and drive retail demand.
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For dispensaries */}
        <section id="for-dispensaries" className="border-b border-slate-800 bg-slate-950">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <div className="grid gap-8 md:grid-cols-[1.2fr,1fr] md:items-center">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
                  Brands + dispensaries on the same page
                </h2>
                <p className="mt-3 text-sm text-slate-400">
                  Dispensary partners can claim their locations, collaborate on menus, and streamline wholesale
                  ordering—without extra logins or complicated training.
                </p>

                <div className="mt-5 grid gap-4 text-xs text-slate-300 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">Claimable locations</p>
                    <p className="mt-1 text-slate-50">
                      Dispensary owners verify and control their pages with a single link.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">Flexible ordering</p>
                    <p className="mt-1 text-slate-50">
                      Orders can flow through email, tablet, or POS integrations.
                    </p>
                  </div>
                </div>

                <button className="mt-6 rounded-full border border-emerald-400/60 bg-slate-950/80 px-4 py-2 text-xs font-semibold text-emerald-200 hover:border-emerald-300">
                  I&apos;m a dispensary · Claim my location
                </button>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300">
                <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Today&apos;s agent report
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                    <div>
                      <p className="text-[11px] text-slate-400">Locations monitored</p>
                      <p className="text-sm font-semibold text-slate-50">124</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">New claims</p>
                      <p className="text-sm font-semibold text-emerald-300">+5 today</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Highlights</p>
                    <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
                      <li>• 9 menus updated with new imagery</li>
                      <li>• 3 locations adjusted pricing to match MSRP</li>
                      <li>• 14 open reorder opportunities this week</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
            <div className="mb-8 text-center">
              <h2 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
                Start with one brand, scale to a portfolio
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Simple, transparent pricing as you grow. Volume-based discounts for multi-state and multi-brand
                operators.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">Free account</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  $0<span className="text-xs font-normal text-slate-400">/forever</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  1 location · Unlimited products · Access to the headless menu &amp; AI budtender.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Brand Accelerator</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  $750<span className="text-xs font-normal text-slate-400">/mo</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  For emerging brands standardizing their first 20–40 locations.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/60 bg-slate-950 p-4 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300">Brand Growth Pro</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-100">
                  $1,500<span className="text-xs font-normal text-emerald-200">/mo</span>
                </p>
                <p className="mt-1 text-xs text-emerald-100/80">
                  For regional leaders managing dozens of partners and SKUs.
                </p>
                <button className="mt-4 w-full rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300">
                  Talk to sales
                </button>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Enterprise Brand Network</p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">Custom</p>
                <p className="mt-1 text-xs text-slate-400">
                  For multi-state, multi-brand portfolios with advanced routing and reporting.
                </p>
              </div>
            </div>

            <p className="mt-5 text-center text-[11px] text-slate-500">
              Free account includes 1 location and unlimited products. All paid plans include a custom domain for
              your headless menu—our team can also model pricing around your current footprint and growth plan.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-slate-950">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <div className="flex flex-col items-center rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-cyan-500/10 px-6 py-8 text-center md:px-10">
              <h2 className="text-lg font-semibold tracking-tight text-slate-50 md:text-xl">
                Ready to give your brand a futuristic ops upgrade?
              </h2>
              <p className="mt-2 max-w-xl text-xs text-emerald-100/90">
                Launch your BakedBot Brand Console, connect a handful of dispensaries, and watch your menu
                accuracy and reorder cadence level up within days.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link href="/onboarding" className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.9)] hover:bg-emerald-300">
                  Get started free
                </Link>
                <button className="rounded-full border border-emerald-300/70 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-emerald-100 hover:border-emerald-200">
                  Book a strategy call
                </button>
              </div>
            </div>

            <footer className="mt-10 grid gap-6 border-t border-slate-800 pt-6 text-[11px] text-slate-500 md:grid-cols-4">
              <div className="space-y-2">
                <p className="font-semibold text-slate-300">BakedBot AI</p>
                <p>Your AI-powered guide to cannabis commerce.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-300">Product</p>
                <p>Features</p>
                <p>Integrations</p>
                <p>Updates</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-300">Company</p>
                <p>About</p>
                <p>Blog</p>
                <p>Contact</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-300">Legal</p>
                <p>Terms</p>
                <p>Privacy</p>
                <p>Compliance</p>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
