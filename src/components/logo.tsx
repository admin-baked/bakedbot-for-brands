
'use client';

import Image from "next/image"
import Link from "next/link"

// Using local logo asset from public folder
const defaultLogo = '/bakedbot-logo-horizontal.png';

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
