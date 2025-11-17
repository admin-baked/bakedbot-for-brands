// app/page.tsx
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      {/* Marketing header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">
              BakedBot AI
            </span>
          </Link>

          {/* Main nav */}
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-white">
              How it works
            </a>
            {/* Demo menu – update this href to your real demo route */}
            <Link href="/menu/default" className="hover:text-white">
              Demo menu
            </Link>
          </nav>

          {/* Auth / CTA */}
          <div className="flex items-center gap-3">
            {/* Login – update route if needed */}
            <Link
              href="/brand-login"
              className="text-sm text-slate-300 hover:text-white"
            >
              Login
            </Link>
            {/* Get started – update route if needed */}
            <Link
              href="/onboarding"
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 md:flex-row md:items-center">
        <div className="flex-1 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Headless Cannabis Commerce
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Keep the customer in your brand funnel
          </h1>
          <p className="max-w-xl text-slate-300">
            BakedBot is an AI-powered headless menu and checkout system that
            embeds directly into your existing brand website, keeping customers
            engaged with your content and products without sending them to a
            third-party marketplace.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            {/* Get started free */}
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-medium text-slate-950 hover:bg-emerald-400"
            >
              Get started free
            </Link>

            {/* View live demo – update href if your demo route is different */}
            <Link
              href="/menu/default"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-100 hover:border-slate-500 hover:bg-slate-900"
            >
              View live demo
            </Link>
          </div>
        </div>

        {/* Right side - Headless Menu Preview Image */}
        <div className="mt-10 flex-1 md:mt-0">
          <div className="relative">
            <Image
              src="https://storage.googleapis.com/stedi-assets/misc/bakedbot-hero-image.png"
              alt="BakedBot Headless Menu Preview"
              width={1200}
              height={988}
              priority
              className="rounded-2xl shadow-2xl shadow-emerald-500/10 ring-1 ring-slate-800"
              data-ai-hint="screenshot website"
            />
          </div>
        </div>
      </section>

      {/* Anchors used by header links so they don't 404-scroll */}
      <section id="features" className="border-t border-slate-800 py-16">
        <div className="mx-auto max-w-6xl px-4 text-slate-200">
          <h2 className="text-xl font-semibold">Features</h2>
          <p className="mt-2 text-sm text-slate-400">
            Feature content goes here.
          </p>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-slate-800 py-16">
        <div className="mx-auto max-w-6xl px-4 text-slate-200">
          <h2 className="text-xl font-semibold">How it works</h2>
          <p className="mt-2 text-sm text-slate-400">
            Steps / explainer content goes here.
          </p>
        </div>
      </section>
    </main>
  );
}