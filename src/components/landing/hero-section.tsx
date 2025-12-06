// src/components/landing/hero-section.tsx
import styles from '@/app/home.module.css';
import { HeroInput } from '@/components/home/hero-input';
import { DemoChatTrigger } from '@/components/landing/demo-chat-trigger';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGrid}>
        <div>
          <div className={styles.eyebrow}>
            <div className={styles.eyebrowPill}>New</div>
            Agentic Commerce OS for Cannabis
          </div>
          <h1 className={styles.heroTitle}>
            Keep the customer in <br />
            your <span className={styles.gradient}>brand funnel</span>.
          </h1>
          <p className={styles.heroSubtitle}>
            BakedBot is a multi-agent AI workforce that powers your brand's headless menu, marketing, and competitive intelligence—all while routing orders to your retail partners.
            <br />
            <span className={styles.eyebrowPill} style={{ marginTop: '1rem', display: 'inline-block' }}>
              ✨ New: Biometric Payments & ID Verification
            </span>
          </p>
          <HeroInput />
          <p className={styles.heroFootnote}>
            Get started free, no credit card required.
          </p>

          {/* Demo CTAs */}
          <div className={styles.heroCtas}>
            <DemoChatTrigger />
            <Link href="/shop/demo" className={styles.btnSecondary}>
              <ShoppingBag size={16} />
              Browse Demo Menu
            </Link>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className={styles.heroImageContainer}>
            <Image
              src="/demo-menu-hero.png"
              alt="40 Tons Demo Menu - AI-powered headless cannabis menu"
              width={600}
              height={500}
              className={styles.heroImage}
              priority
            />
            <div className={styles.heroImageBadge}>
              <span className={styles.dot} />
              Live Demo
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
