// src/components/landing/pricing-section.tsx
import styles from '@/app/home.module.css';
import Link from 'next/link';

const plans = [
    { name: "Free", price: "$0", setup: "1 location", desc: "For brands getting started with AI-powered commerce.", features: ["AI Budtender", "Headless Menu", "Basic Analytics"], pill: "Start Free" },
    { name: "Growth", price: "$350", setup: "Up to 5 locations", desc: "For growing brands that need marketing automation and deeper insights.", features: ["All Free features", "Marketing Playbooks", "Competitor Watch"], pill: "Most Popular" },
    { name: "Scale", price: "$700", setup: "Up to 10 locations", desc: "For established brands scaling their direct-to-customer channel.", features: ["All Growth features", "Advanced Analytics", "Price Optimization"], pill: "Best Value" },
    { name: "Enterprise", price: "Custom", setup: "Unlimited locations", desc: "For MSOs and large brands needing custom integrations and support.", features: ["All Scale features", "Custom Agent Packs", "Priority Support"], pill: "Contact Us" },
];

export function PricingSection() {
  return (
    <section className={styles.section}>
        <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Pricing</h2>
            <p className={styles.sectionKicker}>Simple, transparent pricing that scales with you. No hidden fees, no long-term contracts.</p>
        </div>
        <div className={styles.pricingGrid}>
            {plans.map(plan => (
                <div key={plan.name} className={styles.planCard}>
                    <div className={styles.planLabel}>Plan</div>
                    <div className={styles.planName}>{plan.name}</div>
                    <div className={styles.planPrice}>{plan.price} <span style={{fontWeight: 400, fontSize: 11, color: '#6b7280'}}>/ mo</span></div>
                    <div className={styles.planSetup}>{plan.setup}</div>
                    <div className={styles.planPill}>{plan.pill}</div>
                    <p className={styles.planDesc}>{plan.desc}</p>
                    <ul className={styles.planFeatureList}>
                        {plan.features.map(f => <li key={f}>{f}</li>)}
                    </ul>
                    <Link href="/onboarding" className={styles.planCta}>
                        Get Started <span className={styles.arrow}>→</span>
                    </Link>
                </div>
            ))}
        </div>
    </section>
  );
}
