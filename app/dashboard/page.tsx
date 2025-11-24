// app/dashboard/page.tsx

export default function DashboardPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">
          BakedBot Operator Console
        </h1>
        <p className="text-sm text-gray-600">
          This is a stub dashboard page. Soon this will show sessions, carts,
          orders, agent activity, and Playbooks for your AI agents.
        </p>
      </header>

      <section className="border rounded-2xl px-4 py-6 bg-white text-sm text-gray-700">
        <p>Dashboard coming soon…</p>
        <p className="mt-1 text-gray-500">
          For now, use the Demo Menu and Product Locator to explore the
          customer-facing experience.
        </p>
      </section>
    </main>
  );
}
