// src/components/landing/navbar.tsx
import Link from 'next/link';
import styles from '@/app/home.module.css';

export function Navbar() {
  return (
    <nav className={styles.nav}>
      <div className={styles.navInner}>
        <div className={styles.navLeft}>
          <Link href="/" className="flex items-center gap-2">
            <div className={styles.logoMark}>B</div>
            <div className={styles.logoText}>
              <div className={styles.logoTextMain}>BakedBot</div>
              <div className={styles.logoTextSub}>AI</div>
            </div>
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
