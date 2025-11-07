
import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="BakedBot AI Home">
      <Image
        src="https://storage.googleapis.com/stedi-assets/misc/bakedbot-logo.png"
        alt="BakedBot AI Logo"
        width={140}
        height={40}
        className="h-10 w-auto"
        priority
      />
    </div>
  );
}
