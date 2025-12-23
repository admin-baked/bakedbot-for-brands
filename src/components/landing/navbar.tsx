'use client';

import Link from 'next/link';
import Image from 'next/image';
import styles from '@/app/home.module.css';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';

// Using cloud storage logo asset
const logoUrl = 'https://storage.googleapis.com/bakedbot-global-assets/Bakedbot_2024_vertical_logo-PNG%20transparent.png';

export function Navbar() {
  const { user, isLoading } = useUser();

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
            <Link href="/#product">Product</Link>
            <Link href="/#solutions">Solutions</Link>
            <Link href="/#pricing">Pricing</Link>
            <Link href="/#proof">Proof</Link>
            <Link href="/demo">Demo</Link>
          </div>
        </div>
        <div className={styles.navCta}>
          {!isLoading && user ? (
            <Link href="/dashboard" className={styles.navPrimary}>
              Dashboard
              <span className={styles.arrow}>→</span>
            </Link>
          ) : (
            <>
              <Link href="/brand-login" className={styles.navGhost}>
                Login
              </Link>
              <Link href="/onboarding" className={styles.navPrimary}>
                Get Started
                <span className={styles.arrow}>→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
