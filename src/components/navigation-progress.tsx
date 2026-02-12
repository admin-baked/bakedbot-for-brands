/**
 * Navigation Progress Bar
 *
 * Shows a visual loading indicator at the top of the page during navigation.
 * Prevents the "sticky" feeling when clicking sidebar links.
 */

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Show progress bar when navigation starts
    setIsNavigating(true);

    // Hide after navigation completes (give it a moment to feel instant)
    const timeout = setTimeout(() => {
      setIsNavigating(false);
    }, 150);

    return () => clearTimeout(timeout);
  }, [pathname, searchParams]);

  if (!isNavigating) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-baked-green via-green-400 to-baked-green z-50 animate-progress"
      role="progressbar"
      aria-label="Page loading"
    >
      <div className="h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
    </div>
  );
}
