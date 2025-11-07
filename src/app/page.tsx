'use client';

import { useEffect } from 'react';
import { useStore } from '@/hooks/use-store';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const menuStyle = useStore((state) => state.menuStyle);
  const isHydrated = useStore((state) => state._hasHydrated);
  const router = useRouter();

  useEffect(() => {
    if (isHydrated) {
      if (menuStyle === 'alt') {
        router.replace('/menu-alt');
      } else {
        router.replace('/menu');
      }
    }
  }, [isHydrated, menuStyle, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
