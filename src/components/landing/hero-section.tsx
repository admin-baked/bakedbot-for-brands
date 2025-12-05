// src/components/landing/hero-section.tsx
import styles from '@/app/home.module.css';
import { HeroInput } from '@/components/home/hero-input';
import { DemoChatTrigger } from '@/components/landing/demo-chat-trigger';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

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
          <div className={styles.heroCard}>
            <div className={styles.heroCardHeader}>
              <div className={styles.heroCardTitle}>Smokey Control Center</div>
              <div className={styles.heroCardPill}>Live Demo</div>
            </div>
            <div className={styles.heroCardGrid}>
              <div className={styles.heroMiniCard}>
                <h3 className={styles.heroMiniTitle}>Attributed Revenue</h3>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Last 7d</span>
                  <span className={styles.metricValue}>$18.4k</span>
                </div>
                <div className={styles.metricRow}>
                  <span className={styles.metricLabel}>Today</span>
                  <span className={styles.metricValue}>$2.1k</span>
                </div>
              </div>
              <div className={styles.heroMiniCard}>
                <h3 className={styles.heroMiniTitle}>Agent Activity</h3>
                <div className={styles.heroChatBubble}>
                  <div className={styles.heroChatFrom}><span className={styles.dot} />Smokey</div>
                  <p className={styles.heroChatText}>
                    A customer asked for <span className={styles.highlight}>"relaxing indica pre-rolls"</span> and I recommended Gorilla Glue #4.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

