// src/components/landing/footer.tsx
import styles from '@/app/home.module.css';
import Link from 'next/link';
import { APP_VERSION_DISPLAY } from '@/lib/version';

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span>© {new Date().getFullYear()} BakedBot AI <span className="text-[10px] opacity-40 ml-2">{APP_VERSION_DISPLAY}</span></span>
        <div className={styles.footerLinks}>
            <Link href="#">Terms</Link>
            <Link href="#">Privacy</Link>
            <Link href="#">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
