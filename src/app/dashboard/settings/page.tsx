
// app/dashboard/settings/page.tsx

export default function DashboardSettingsPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Page heading */}
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

      {/* Headless Menu section */}
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
              deep-links. Later this will be per-brand and per-market.
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

        <div className="flex items-center justify-between pt-2 text-sm">
          <div className="flex items-center gap-2">
            <input id="show-demo-menu" type="checkbox" defaultChecked />
            <label htmlFor="show-demo-menu">
              Show demo menu entry in main navigation
            </label>
          </div>
          <button className="rounded-full px-4 py-1.5 text-xs bg-black text-white hover:bg-gray-900">
            Save (stub)
          </button>
        </div>
      </section>

      {/* Smokey / AI Budtender section */}
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
            <p className="text-xs text-gray-500">
              What customers see in the chat header.
            </p>
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
            <p className="text-xs text-gray-500">
              Short description shown in internal tools and future
              customer-facing surfaces.
            </p>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <label className="block text-xs font-medium text-gray-700">
            Voice &amp; tone instructions
          </label>
          <textarea
            defaultValue="Answer like a knowledgeable, friendly budtender. Be educational, never make medical claims, and defer to local regulations."
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
          />
          <p className="text-xs text-gray-500">
            Later this will be persisted per brand and used as
            system-level instructions for Smokey.
          </p>
        </div>

        <div className="space-y-1 text-sm">
          <label className="block text-xs font-medium text-gray-700">
            Default disclaimer
          </label>
          <textarea
            defaultValue="Smokey is an AI assistant and is not a doctor. Always follow local laws and consume responsibly."
            className="w-full border rounded-lg px-3 py-2 text-sm min-h-[60px]"
          />
          <p className="text-xs text-gray-500">
            Appended to answers where required by Deebo and local
            regulations.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 text-sm">
          <div className="flex items-center gap-2">
            <input id="smokey-enabled" type="checkbox" defaultChecked />
            <label htmlFor="smokey-enabled">
              Enable Smokey on headless menu &amp; demo pages
            </label>
          </div>
          <button className="rounded-full px-4 py-1.5 text-xs bg-black text-white hover:bg-gray-900">
            Save (stub)
          </button>
        </div>
      </section>

      {/* Future: compliance / Deebo section stub */}
      <section className="border rounded-2xl bg-white px-5 py-4 space-y-3">
        <h2 className="font-display text-xl">
          Compliance &amp; Guardrails (Deebo)
        </h2>
        <p className="text-sm text-gray-600 max-w-xl">
          This section will let you choose which Deebo rule-packs apply
          to Smokey, menus, and outbound campaigns for each jurisdiction.
        </p>
        <p className="text-xs text-gray-500">
          For now this is a placeholder. The logic lives in Deebo&apos;s
          Regulation OS and will be wired here later.
        </p>
      </section>
    </main>
  );
}
