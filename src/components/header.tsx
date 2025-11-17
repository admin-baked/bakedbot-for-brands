'use client';

import Link from 'next/link';

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        {/* Logo → homepage */}
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-slate-50"
        >
          BakedBot AI
        </Link>

        {/* Center nav */}
        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a href="#features" className="hover:text-slate-50">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-slate-50">
            How it works
          </a>
          <Link href="/menu/default" className="hover:text-slate-50">
            Demo menu
          </Link>
        </nav>

        {/* Right side auth CTAs */}
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/brand-login"
            className="text-slate-300 hover:text-slate-50"
          >
            Login
          </Link>
          <Link
            href="/onboarding"
            className="rounded-full bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
export { Header };
