// src/components/landing/proof-section.tsx
import styles from '@/app/home.module.css';

const proofs = [
    { name: "Ultra Cannabis", tagline: "Premium Flower", metrics: "15% increase in online orders", note: "Used Smokey to route website traffic to their retail partners, capturing customer data that was previously lost to marketplaces." },
    { name: "Zaza Factory", tagline: "Exotic Strains", metrics: "2.5x higher AOV", note: "Created a headless menu with AI recommendations, resulting in significantly higher average order value than their marketplace channels." },
    { name: "Melanie's Ecstatic Edibles", tagline: "Gourmet Edibles", metrics: "30% faster sell-through", note: "Deployed marketing playbooks to alert their email list about new product drops at specific dispensaries, driving foot traffic on day one." },
];

export function ProofSection() {
    return (
        <section id="proof" className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Proof</h2>
                <p className={styles.sectionKicker}>BakedBot is built with input from leading brands in the cannabis industry.</p>
            </div>
            <div className={styles.proofGrid}>
                {proofs.map(p => (
                    <div key={p.name} className={styles.proofCard}>
                        <h3 className={styles.proofName}>{p.name}</h3>
                        <p className={styles.proofTagline}>{p.tagline}</p>
                        <p className={styles.proofMetrics}>Result: <strong>{p.metrics}</strong></p>
                        <p className={styles.proofNote}>{p.note}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
