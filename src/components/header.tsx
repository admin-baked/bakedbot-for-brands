// components/header.tsx
export function Header() {
  return (
    <header className="w-full border-b px-4 py-3 flex items-center justify-between">
      <div className="font-display text-xl">
        BakedBot AI
      </div>
      <nav className="text-sm flex gap-4">
        <a href="/menu" className="hover:underline">
          Menu
        </a>
        <a href="/dashboard" className="hover:underline">
          Dashboard
        </a>
      </nav>
    </header>
  );
}
