'use client'

import Image from "next/image"
import Link from "next/link"

type Props = {
  height?: number
  priority?: boolean
  className?: string
}

export default function Logo({ height = 28, priority = true, className }: Props) {
  const width = Math.round(height * 5); // Adjust ratio as needed for your asset

  return (
    <Link href="/" aria-label="BakedBot AI — Home" className={className}>
      <Image
        src="https://storage.googleapis.com/stedi-assets/misc/bakedbot-logo-horizontal.png"
        alt="BakedBot AI"
        width={width}
        height={height}
        priority={priority}
        sizes={`${width}px`}
      />
    </Link>
  )
}
