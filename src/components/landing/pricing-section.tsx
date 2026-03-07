// src/components/landing/pricing-section.tsx
import styles from '@/app/home.module.css';
import Link from 'next/link';
import { PRICING_PLANS, OVERAGES_TABLE } from '@/lib/config/pricing';

export function PricingSection() {
    const getPlanCtaHref = (planId: string) => {
        if (planId === 'scout') return '/get-started?plan=scout';
        if (planId === 'empire') return '/contact';
        return `/get-started?plan=${planId}`;
    };

    return (
        <section id="pricing" className={styles.section}>
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>Free listings. Paid claims = control + proof + demand capture.</h2>
                    <p className={styles.sectionKicker}>
                        Own your page, capture organic traffic, and convert it into orders + leads — without renting visibility from marketplaces.
                    </p>
                </div>
                {/* Proof Point */}
                <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: '#166534',
                    maxWidth: '400px',
                    marginTop: '10px'
                }}>
                    <strong>Proof:</strong> Ultra Cannabis saw <strong>3× visibility</strong> and <strong>50+ orders in 90 days</strong> after launching our SEO + automation stack.
                </div>
            </div>

            <div id="cards" className={styles.pricingGrid}>
                {PRICING_PLANS.map(plan => (
                    <div key={plan.name} className={styles.planCard} style={plan.highlight ? { border: '2px solid #16a34a', position: 'relative', overflow: 'hidden' } : {}}>
                        <div className={styles.planLabel} style={{ fontSize: '12px' }}>{plan.priceDisplay} <span style={{ textTransform: 'none', color: '#6b7280', fontWeight: 400 }}>{plan.period}</span></div>
                        <div className={styles.planName} style={{ fontSize: '18px', marginBottom: '4px' }}>{plan.name}</div>

                        <div className={styles.planSetup} style={{ fontStyle: 'italic', marginBottom: '12px' }}>{plan.setup}</div>

                        <div className={styles.planPill} style={{ alignSelf: 'flex-start', marginBottom: '12px' }}>{plan.pill}</div>

                        <ul className={styles.planFeatureList} style={{ marginBottom: '16px', flex: 1 }}>
                            {plan.features.map(f => <li key={f}>{f}</li>)}
                        </ul>

                        <Link href={getPlanCtaHref(plan.id)} className={styles.planCta} style={{
                            background: plan.highlight ? '#020617' : 'transparent',
                            color: plan.highlight ? 'white' : '#020617',
                            border: plan.highlight ? 'none' : '1px solid #e2e8f0',
                            padding: '10px',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            marginTop: 'auto'
                        }}>
                            {plan.id === 'scout' ? 'Hire a Scout' : `Start ${plan.name}`}
                        </Link>
                    </div>
                ))}
            </div>

            {/* ZIP Expansion */}
            <div style={{ marginTop: '40px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Need more ZIP coverage? Add ZIPs to any plan.</h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                    Pro includes <strong>3 ZIPs</strong> · Growth includes <strong>10 ZIPs</strong> · Empire includes <strong>unlimited ZIPs</strong>
                </p>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {(() => {
                        const zipRow = OVERAGES_TABLE.find(r => r.k === 'Additional ZIP Codes');
                        if (!zipRow) return null;
                        return [
                            { label: 'Pro', rate: zipRow.pro },
                            { label: 'Growth', rate: zipRow.growth },
                            { label: 'Empire', rate: zipRow.empire },
                        ].map(({ label, rate }) => (
                            <div key={label} style={{ background: 'white', padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontWeight: 700 }}>{label}</span>
                                <span style={{ color: '#64748b' }}>{rate} per ZIP</span>
                            </div>
                        ));
                    })()}
                </div>

                <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                    "Perfect for brands carried across multiple metros — pay for coverage, not vague 'visibility.'"
                </p>
            </div>

            {/* Tiny Print Rules */}
            <div style={{ marginTop: '24px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                <p>• <strong>Pro features are included inside Growth + Empire</strong> (no double-charging to claim).</p>
                <p>• Compliance guardrails apply by market (Deebo pre-checks public copy + CTAs).</p>
            </div>

        </section>
    );
}
