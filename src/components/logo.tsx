
'use client';

import Image from "next/image"
import Link from "next/link"

// Using cloud storage logo asset
const defaultLogo = 'https://storage.cloud.google.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png';

type Props = {
  height?: number
  priority?: boolean
  className?: string
}

export default function Logo({ height = 40, priority = true, className }: Props) {
  const width = Math.round(height * 2.5); // Adjust ratio

  return (
    <Link href="/" aria-label="BakedBot AI — Home" className={className}>
      <Image
        src={defaultLogo}
        alt="BakedBot AI"
        width={width}
        height={height}
        priority={priority}
        sizes={`${width}px`}
        unoptimized
      />
    </Link>
  )
}
