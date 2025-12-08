// src/components/landing/pricing-section.tsx
import styles from '@/app/home.module.css';
import Link from 'next/link';
import { PRICING_PLANS } from '@/lib/config/pricing';

export function PricingSection() {
    return (
        <section id="pricing" className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Pricing</h2>
                <p className={styles.sectionKicker}>Simple, transparent pricing that scales with you. No hidden fees, no long-term contracts.</p>
            </div>
            <div className={styles.pricingGrid}>
                {PRICING_PLANS.map(plan => (
                    <div key={plan.name} className={styles.planCard}>
                        <div className={styles.planLabel}>Plan</div>
                        <div className={styles.planName}>{plan.name}</div>
                        <div className={styles.planPrice}>{plan.priceDisplay} <span style={{ fontWeight: 400, fontSize: 11, color: '#6b7280' }}>{plan.period}</span></div>
                        <div className={styles.planSetup}>{plan.setup}</div>
                        <div className={styles.planPill}>{plan.pill}</div>
                        <p className={styles.planDesc}>{plan.desc}</p>
                        <ul className={styles.planFeatureList}>
                            {plan.features.map(f => <li key={f}>{f}</li>)}
                        </ul>
                        <Link href="/pricing" className={styles.planCta}>
                            View Details <span className={styles.arrow}>→</span>
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
}
