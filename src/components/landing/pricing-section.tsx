// src/components/landing/pricing-section.tsx
import styles from '@/app/home.module.css';
import Link from 'next/link';
import { PRICING_PLANS, COVERAGE_PACKS } from '@/lib/config/pricing';
import { getFoundersClaimCount } from '@/server/actions/createClaimSubscription';

export async function PricingSection() {
    // Dynamic Founders Slots
    const foundersCount = await getFoundersClaimCount();
    const totalSlots = 75; // Per user request
    const remainingSlots = Math.max(0, totalSlots - foundersCount);

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

            {/* Founders Launch Banner */}
            {remainingSlots > 0 && (
                <div style={{
                    background: 'linear-gradient(to right, #16a34a, #15803d)',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)'
                }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>Founders Claim is live — {remainingSlots} slots left.</div>
                        <div style={{ fontSize: '13px', opacity: 0.9 }}>Lock in <strong>$79/mo for life</strong> (same features as Claim Pro).</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Link href="/pricing?plan=founders" style={{
                            background: 'white',
                            color: '#16a34a',
                            padding: '8px 16px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            textDecoration: 'none'
                        }}>
                            Get Founders Pricing
                        </Link>
                        <Link href="#cards" style={{
                            background: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 600,
                            textDecoration: 'none'
                        }}>
                            See Plans
                        </Link>
                    </div>
                </div>
            )}

            <div id="cards" className={styles.pricingGrid}>
                {PRICING_PLANS.map(plan => (
                    <div key={plan.name} className={styles.planCard} style={plan.scarcity ? { border: '2px solid #16a34a', position: 'relative', overflow: 'hidden' } : {}}>
                        {plan.scarcity && (
                            <div style={{
                                background: '#16a34a',
                                color: 'white',
                                fontSize: '10px',
                                fontWeight: '700',
                                textAlign: 'center',
                                padding: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                marginBottom: '8px',
                                borderRadius: '4px'
                            }}>
                                Founders Launch: {remainingSlots} Slots Left
                            </div>
                        )}
                        <div className={styles.planLabel} style={{ fontSize: '12px' }}>{plan.priceDisplay} <span style={{ textTransform: 'none', color: '#6b7280', fontWeight: 400 }}>{plan.period}</span></div>
                        <div className={styles.planName} style={{ fontSize: '18px', marginBottom: '4px' }}>{plan.name}</div>

                        <div className={styles.planSetup} style={{ fontStyle: 'italic', marginBottom: '12px' }}>{plan.setup}</div>

                        <div className={styles.planPill} style={{ alignSelf: 'flex-start', marginBottom: '12px' }}>{plan.pill}</div>

                        <ul className={styles.planFeatureList} style={{ marginBottom: '16px', flex: 1 }}>
                            {plan.features.map(f => <li key={f}>{f}</li>)}
                        </ul>

                        <Link href={`/pricing?plan=${plan.id}`} className={styles.planCta} style={{
                            background: plan.highlight || plan.scarcity ? '#020617' : 'transparent',
                            color: plan.highlight || plan.scarcity ? 'white' : '#020617',
                            border: plan.highlight || plan.scarcity ? 'none' : '1px solid #e2e8f0',
                            padding: '10px',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            marginTop: 'auto'
                        }}>
                            {/* Use logic to display specific button text for free vs paid  */}
                            {plan.id === 'free' ? 'Hire a Scout' :
                                plan.id === 'founders_claim' ? 'Get Founders Pricing' :
                                    `Start ${plan.name}`}
                        </Link>

                        {/* Special Toggle for Claim Pro to show Founders Option */}
                        {plan.id === 'claim_pro' && remainingSlots > 0 && (
                            <div style={{ marginTop: '10px', fontSize: '11px', color: '#16a34a', textAlign: 'center', background: '#f0fdf4', padding: '6px', borderRadius: '6px' }}>
                                Founders: $79/mo locked-in ({remainingSlots} left)
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Coverage Packs */}
            <div style={{ marginTop: '40px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Need national coverage? Add ZIP packs.</h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Claim Pro includes <strong>up to 25 ZIP pages (or 1 core zone)</strong></p>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {COVERAGE_PACKS.map(pack => (
                        <div key={pack.id} style={{ background: 'white', padding: '12px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 700 }}>{pack.name}</span>
                            <span style={{ color: '#64748b' }}>{pack.priceDisplay}/mo</span>
                        </div>
                    ))}
                </div>

                <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                    “Perfect for brands carried across multiple metros — pay for coverage, not vague ‘visibility.’”
                </p>
            </div>

            {/* Tiny Print Rules */}
            <div style={{ marginTop: '24px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                <p>• <strong>Claim Pro is included inside Growth + Scale</strong> (no double-charging to claim).</p>
                <p>• Compliance guardrails apply by market (Deebo pre-checks public copy + CTAs).</p>
            </div>

        </section>
    );
}
