// src/components/header.tsx
'use client';

import Link from 'next/link';
import { useDevAuth } from '@/dev-auth';
import Logo from './logo';

const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true';

export function Header() {
  const { user, loginAs, logout } = useDevAuth();

  return (
    <header className="w-full border-b px-4 py-3 flex items-center justify-between">
      {/* Left side: logo + nav */}
      <div className="flex items-center gap-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href="/menu/default" className="hover:underline">
            Demo Menu
          </Link>
          <Link href="/product-locator" className="hover:underline">
            Product Locator
          </Link>
        </nav>
      </div>

      {/* Right side: demo mode toggle / search / cart / auth / CTA */}
      <div className="flex items-center gap-4 text-sm">
        {/* ...Demo Mode toggle, search icon, cart icon, etc... */}

        {/* Auth region */}
        {!authEnabled ? (
          // DEV MODE: persona picker instead of real login
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-xs text-gray-600">
                  {user.name}
                </span>
                <button
                  onClick={logout}
                  className="text-xs underline"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => loginAs('brand')}
                  className="text-xs underline"
                >
                  Brand (dev)
                </button>
                <button
                  onClick={() => loginAs('dispensary')}
                  className="text-xs underline"
                >
                  Dispensary (dev)
                </button>
              </>
            )}
          </div>
        ) : (
          // REAL AUTH mode (future)
          <Link href="/login" className="hover:underline">
            Login
          </Link>
        )}

        {/* Get Started – always available */}
        <Link
          href="/onboarding"
          className="rounded-full bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition"
        >
          Get Started
        </Link>
      </div>
    </header>
  );
}
