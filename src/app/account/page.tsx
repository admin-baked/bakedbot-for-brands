
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account | BakedBot AI',
};

export const dynamic = 'force-dynamic';

export default function AccountPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Account settings and brand configuration will live here. This placeholder keeps the
          dashboard navigation and build happy while we wire in the full experience.
        </p>
      </header>

      <section className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
        <p>
          Coming soon: brand profile, jurisdictions, stack integrations, and team access controls.
        </p>
      </section>
    </main>
  );
}
