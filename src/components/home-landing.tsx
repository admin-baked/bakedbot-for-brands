// components/home-landing.tsx
export function HomeLanding() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="font-display text-4xl md:text-5xl font-semibold text-center">
        BakedBot AI
      </h1>

      <p className="font-sans text-lg md:text-xl max-w-2xl text-center text-gray-600">
        Agentic Commerce OS for cannabis brands. Smokey, Craig, Pops, Ezal,
        Deebo, Money Mike, and Mrs. Parker – all working your funnel 24/7.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <a
          href="/menu"
          className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-medium hover:bg-black hover:text-white transition"
        >
          View Demo Menu
        </a>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium bg-black text-white hover:opacity-90 transition"
        >
          Open Operator Console
        </a>
      </div>
    </main>
  );
}
