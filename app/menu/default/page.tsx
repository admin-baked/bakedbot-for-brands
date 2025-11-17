
// app/menu/default/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo Menu – BakedBot AI",
};

export default function DemoMenuPage() {
  // TODO: Replace this with your real demo menu component
  // e.g. <PublicMenu brandId="default" />
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <h1 className="text-3xl font-bold mb-4">Demo menu</h1>
      <p className="text-slate-300 mb-6">
        This is the public demo of your headless menu and AI budtender.
      </p>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-sm text-slate-300">
          Hook your real menu component in here once the route is working.
        </p>
      </div>
    </main>
  );
}
