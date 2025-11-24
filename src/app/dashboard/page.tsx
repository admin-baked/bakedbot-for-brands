// src/app/dashboard/page.tsx

export default function DashboardPage() {
  // For now, keep this 100% static and dependency-free.
  // We’ll layer in Firestore + brands once routing is rock solid.
  return (
    <main className="min-h-screen w-full bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Welcome to your BakedBot control center. This is where we&apos;ll teach Craig,
          Deebo, Smokey & friends how to run your brand.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-medium">Playbooks</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No playbooks wired up yet. Next step: connect this view to Firestore
            and list your brand automations here.
          </p>
        </div>
      </div>
    </main>
  );
}
