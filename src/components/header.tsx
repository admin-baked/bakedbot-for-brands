// src/components/header.tsx
'use client';

import Link from 'next/link';

const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';

export function Header() {
  return (
    <header className="w-full border-b px-4 py-3 flex items-center justify-between">
      <div className="font-display text-xl">
        BakedBot AI
      </div>
      <nav className="text-sm flex items-center gap-4">
        <Link href="/menu/default" className="hover:underline">
          Demo Menu
        </Link>
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>

         <div className="flex items-center gap-4 ml-4">
            {authEnabled && (
                <Link href="/login" className="text-sm hover:underline">
                Login
                </Link>
            )}

            <Link
                href={authEnabled ? '/onboarding' : '/menu/default'}
                className="rounded-full bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition"
            >
                Get Started
            </Link>
        </div>
      </nav>
    </header>
  );
}
