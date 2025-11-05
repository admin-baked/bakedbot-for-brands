import Image from 'next/image';

export function Logo() {
  return (
    <div className="flex items-center gap-2" aria-label="BakedBot AI Home">
      <Image
        src="https://bakedbot.ai/wp-content/uploads/2024/10/Bakedbot_2024_vertical_logo-PNG-transparent.webp"
        alt="BakedBot AI Logo"
        width={140}
        height={40}
        className="h-10 w-auto"
        priority
      />
    </div>
  );
}
