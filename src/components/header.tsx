
// components/header.tsx
import Logo from '@/components/logo';
import Link from 'next/link';

export function Header() {
  return (
    <header className="w-full border-b px-4 py-3 flex items-center justify-between">
      <Logo />
      <nav className="text-sm flex gap-4">
        <Link href="/menu/default" className="hover:underline">
          Menu
        </Link>
        <Link href="/dashboard" className="hover:underline">
          Dashboard
        </Link>
      </nav>
    </header>
  );
}
