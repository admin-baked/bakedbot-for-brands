'use client'
import { useHydrated } from '@/hooks/useHydrated';

export function SafeBadge({ value }: { value: number | null | undefined }) {
  const hydrated = useHydrated();
  const shown = hydrated && typeof value === 'number' ? value : 0;

  // IMPORTANT: the <span> exists on both SSR and CSR.
  return (
    <span
      className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-foreground text-primary font-bold text-xs"
      suppressHydrationWarning
      aria-hidden={shown === 0}
      style={{ opacity: shown === 0 ? 0 : 1, transition: 'opacity 0.2s ease-in-out' }}
    >
      {shown}
    </span>
  );
}
