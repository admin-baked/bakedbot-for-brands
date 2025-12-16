
'use client';

import Image from "next/image"
import Link from "next/link"

// Using cloud storage logo asset
const defaultLogo = 'https://storage.googleapis.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png';

type Props = {
  height?: number
  priority?: boolean
  className?: string
}

export default function Logo({ height = 40, priority = true, className }: Props) {
  const width = Math.round(height * 2.5); // Adjust ratio

  return (
    <Link href="/" aria-label="BakedBot AI — Home" className={`flex items-center gap-1.5 ${className || ''}`}>
      <Image
        src={defaultLogo}
        alt="BakedBot AI"
        width={width}
        height={height}
        priority={priority}
        sizes={`${width}px`}
        unoptimized
      />
      <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        Beta
      </span>
    </Link>
  )
}
