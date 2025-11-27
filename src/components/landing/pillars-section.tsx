// src/components/landing/pillars-section.tsx
import styles from '@/app/home.module.css';

const pillars = [
  { title: "Own the Funnel", body: "Drive traffic to your brand site with an intelligent, SEO-friendly menu. Keep the customer relationship instead of handing it to a marketplace.", features: ["AI Budtender", "Headless Menus", "Product Locator"] },
  { title: "Automate Marketing", body: "Deploy AI agents to run lifecycle campaigns, send new product alerts, and re-engage lapsed customers via email and SMS.", features: ["Playbooks", "Lifecycle Flows", "Compliance AI"] },
  { title: "Unlock Intelligence", body: "Your agents track competitor pricing, monitor menu changes, and analyze sales data to give you a real-time edge in your market.", features: ["Price Monitoring", "Analytics", "Forecasting"] },
];

export function PillarsSection() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>The Agentic Commerce OS</h2>
        <p className={styles.sectionKicker}>BakedBot is more than a chatbot. It's a workforce of specialized AI agents built for the unique challenges of the cannabis industry.</p>
      </div>
      <div className={styles.pillarsGrid}>
        {pillars.map(pillar => (
          <div key={pillar.title} className={styles.pillarCard}>
            <p className={styles.pillarTag}>Core Pillar</p>
            <h3 className={styles.pillarTitle}>{pillar.title}</h3>
            <p className={styles.pillarBody}>{pillar.body}</p>
            <ul className={styles.pillarList}>
              {pillar.features.map(feature => <li key={feature}>{feature}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
