// app/dashboard/settings/page.tsx

export default function DashboardSettingsPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
          Dashboard · Settings
        </p>
        <h1 className="font-display text-3xl">
          Workspace Settings
        </h1>
        <p className="text-sm text-gray-600 max-w-2xl">
          Configure your headless menu, Smokey (AI budtender), and other
          workspace defaults.
        </p>
      </header>

      <section className="border rounded-2xl bg-white px-5 py-4 text-sm text-gray-700">
        <p>Settings stub – headless menu & Smokey config will live here.</p>
      </section>
    </main>
  );
}
