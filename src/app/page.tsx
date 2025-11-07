
'use client';

import { useEffect } from 'react';
import { useStore } from '@/hooks/use-store';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { menuStyle, _hasHydrated } = useStore(state => ({ menuStyle: state.menuStyle, _hasHydrated: state._hasHydrated }));
  const router = useRouter();

  useEffect(() => {
    if (_hasHydrated) {
      if (menuStyle === 'alt') {
        router.replace('/menu-alt');
      } else {
        router.replace('/menu');
      }
    }
  }, [_hasHydrated, menuStyle, router]);

  // Render a loading spinner until the store is hydrated and redirection happens.
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
