
// src/components/home-landing.tsx
import Link from 'next/link';

export function HomeLanding() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="font-teko text-4xl md:text-5xl font-semibold text-center">
        BakedBot AI
      </h1>

      <p className="font-sans text-lg md:text-xl max-w-2xl text-center text-muted-foreground">
        Agentic Commerce OS for cannabis brands. Smokey (AI budtender), Craig
        (marketer), Pops (analyst), Ezal (lookout), Deebo (compliance), Money
        Mike (pricing), and Mrs. Parker (loyalty) working your funnel 24/7.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/menu/default"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          View Demo Menu
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Open Operator Console
        </Link>
      </div>
    </main>
  );
}
