
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useStore } from '@/hooks/use-store';
import { defaultLogo } from '@/lib/data';

export function Logo() {
  const { brandUrl } = useStore(); // Assuming brand logo is related to brandUrl or a similar property
  const [logoSrc, setLogoSrc] = useState(brandUrl || defaultLogo);

  // In a real app, you might have a specific `brand.logoUrl` from your user's profile.
  // For now, we'll simulate it being potentially missing and falling back.
  const potentialBrandLogo = undefined; 

  return (
    <div className="flex items-center gap-2" aria-label="BakedBot AI Home">
      <Image
        src={potentialBrandLogo || logoSrc}
        alt="BakedBot AI Logo"
        width={140}
        height={28}
        className="h-7 w-auto"
        priority
        unoptimized
        onError={() => setLogoSrc(defaultLogo)}
      />
    </div>
  );
}
