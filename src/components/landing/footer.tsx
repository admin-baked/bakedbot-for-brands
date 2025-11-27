// src/components/landing/footer.tsx
import styles from '@/app/home.module.css';
import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <span>© {new Date().getFullYear()} BakedBot AI</span>
        <div className={styles.footerLinks}>
            <Link href="#">Terms</Link>
            <Link href="#">Privacy</Link>
            <Link href="#">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
