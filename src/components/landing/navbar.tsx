// src/components/landing/navbar.tsx
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/app/home.module.css';

// Using cloud storage logo asset
const logoUrl = 'https://storage.googleapis.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png';

export function Navbar() {
  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        <div className={styles.navLeft}>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={logoUrl}
              alt="BakedBot AI"
              width={120}
              height={48}
              priority
              unoptimized
              style={{ height: '48px', width: 'auto' }}
            />
          </Link>
          <div className={styles.navLinks}>
            <Link href="/dashboard/playbooks">Playbooks</Link>
            <Link href="/dashboard/analytics">Analytics</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
        </div>
        <div className={styles.navCta}>
          <Link href="/brand-login" className={styles.navGhost}>
            Brand Login
          </Link>
          <Link href="/onboarding" className={styles.navPrimary}>
            Get Started
            <span className={styles.arrow}>→</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
