// src/app/page.tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">
        <section className="space-y-6">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-400">
            Autonomous Cannabis Commerce
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            BakedBot AI turns cannabis menus
            <br className="hidden md:block" /> into autonomous sales machines.
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl">
            Smokey, our AI budtender, helps confused shoppers find the right product,
            while Craig, Pops, and the rest of the crew handle compliant marketing,
            insights, and growth in the background.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="https://ecstaticedibles.com"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 transition"
            >
              View Live Demo
            </a>
            <a
              href="https://calendly.com/baked-martez/30min"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium border border-gray-600 hover:border-emerald-400 hover:text-emerald-300 transition"
            >
              Book a Strategy Call
            </a>
          </div>

          <p className="text-xs text-gray-500">
            Proven lift: 23% more conversions, 18% higher cart size, and automated compliance
            for IL, MI, OH, CA, and NY.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-800 bg-zinc-900/60 p-5 space-y-2">
            <h2 className="text-sm font-semibold">Smokey · AI Budtender</h2>
            <p className="text-xs text-gray-400">
              Conversational recommendations grounded in real inventory, terpenes, and
              desired effects. Built to reduce “what should I buy?” anxiety.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-zinc-900/60 p-5 space-y-2">
            <h2 className="text-sm font-semibold">Craig · Marketing Automation</h2>
            <p className="text-xs text-gray-400">
              Email and SMS campaigns that stay inside TCPA, CTIA, and state rules — with
              Deebo checking every send.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-zinc-900/60 p-5 space-y-2">
            <h2 className="text-sm font-semibold">Pops · Intelligence</h2>
            <p className="text-xs text-gray-400">
              Daily insights on what&apos;s selling, who&apos;s buying, and where margins are
              hiding, so owners can make decisions in minutes, not weeks.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-200">
            Trusted by operators pushing the culture forward
          </h3>
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <span>Ultra Cannabis (Detroit)</span>
            <span>·</span>
            <span>Zaza Factory</span>
            <span>·</span>
            <span>40 Tons Brand</span>
          </div>
        </section>
      </div>
    </main>
  );
}
