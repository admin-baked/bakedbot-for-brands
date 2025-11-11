
import Image from 'next/image';
import { defaultLogo } from '@/lib/data';

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="BakedBot AI Home">
      <Image
        src={defaultLogo}
        alt="BakedBot AI Logo"
        width={140}
        height={28}
        className="h-7 w-auto"
        priority
        unoptimized
      />
    </div>
  );
}
