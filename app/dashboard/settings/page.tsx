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
          workspace defaults. This is the control room for how BakedBot
          shows up on your brand sites and in retail partner menus.
        </p>
      </header>

      <section className="border rounded-2xl bg-white px-5 py-4 space-y-3">
        <h2 className="font-display text-xl">
          Headless Menu
        </h2>
        <p className="text-sm text-gray-600 max-w-xl">
          Control the default demo menu and routing for your brand&apos;s
          headless experience powered by CannMenus and Smokey.
        </p>

        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Default demo menu route
            </label>
            <input
              type="text"
              defaultValue="/menu/default"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500">
              Used in nav for &quot;Demo Menu&quot; and internal
              deep-links.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Product locator route
            </label>
            <input
              type="text"
              defaultValue="/product-locator"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500">
              Standalone &quot;where to buy&quot; locator experience for
              your brand.
            </p>
          </div>
        </div>
      </section>

      <section className="border rounded-2xl bg-white px-5 py-4 space-y-3">
        <h2 className="font-display text-xl">
          Smokey (AI Budtender)
        </h2>
        <p className="text-sm text-gray-600 max-w-xl">
          Define Smokey&apos;s persona, tone, and guardrails for your
          brand. These settings will be used by the headless menu and
          any embedded chat experiences.
        </p>

        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Display name
            </label>
            <input
              type="text"
              defaultValue="Smokey"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">
              Persona tagline
            </label>
            <input
              type="text"
              defaultValue="Friendly, compliance-safe cannabis guide."
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
