'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Logo height={32} />
            </Link>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#features" className="hover:text-emerald-300">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-emerald-300">
              How it works
            </a>
            <Link href="/menu/default" className="hover:text-emerald-300">
              Demo menu
            </Link>
          </nav>
          {/* Corrected Auth / CTAs using Button asChild */}
          <div className="flex items-center gap-3 text-sm">
            <Button asChild variant="outline" size="sm" className="rounded-full border-slate-700 px-3 py-1.5 text-slate-200 hover:border-slate-500 hover:text-slate-200">
              <Link href="/brand-login">
                Login
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-full bg-emerald-400 px-4 py-1.5 font-medium text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.75)] hover:bg-emerald-300">
              <Link href="/onboarding">
                Get started
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative isolate overflow-hidden">
        <div
          className="absolute left-1/2 right-0 top-0 -z-10 -ml-24 transform-gpu overflow-hidden blur-3xl lg:ml-24 xl:ml-48"
          aria-hidden="true"
        >
          <div
            className="aspect-[801/1036] w-[50.0625rem] bg-gradient-to-tr from-[#10b981] to-[#3b82f6] opacity-30"
            style={{
              clipPath:
                'polygon(63.1% 29.5%, 100% 17.1%, 76.6% 3%, 48.4% 0%, 44.6% 4.7%, 54.5% 25.3%, 59.8% 49%, 55.2% 57.8%, 44.4% 57.2%, 27.8% 47.9%, 35.1% 81.5%, 0% 97.7%, 39.2% 100%, 35.2% 81.4%, 97.2% 52.8%, 63.1% 29.5%)',
            }}
          />
        </div>
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:py-32">
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-300">
              Headless Cannabis Commerce
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Keep the customer in your brand funnel
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            BakedBot is an AI-powered headless menu and checkout system that embeds directly into your existing brand website, keeping customers engaged with your content and products without sending them to a third-party marketplace.
          </p>
          {/* Corrected Hero buttons */}
          <div className="mt-10 flex items-center justify-center gap-x-6">
             <Button asChild size="sm" className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.9)] hover:bg-emerald-300">
              <Link href="/onboarding">
                Get started free
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 hover:border-slate-500">
              <Link href="/menu/default">
                View live demo
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
