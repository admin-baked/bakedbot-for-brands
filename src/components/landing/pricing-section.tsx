// src/components/landing/pricing-section.tsx
import styles from '@/app/home.module.css';
import Link from 'next/link';
import { PRICING_PLANS, OVERAGES_TABLE } from '@/lib/config/pricing';

export function PricingSection() {
    const getPlanCtaHref = (planId: string) => {
        if (planId === 'free') return '/onboarding?plan=free';
        if (planId === 'enterprise') return '/contact';
        if (planId === 'optimize') return '/contact';
        return `/onboarding?plan=${planId}`;
    };

    return (
        <section id="pricing" className={styles.section}>
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>Free listings. Paid plans unlock AI agents + revenue tools.</h2>
                    <p className={styles.sectionKicker}>
                        Own your page, capture organic traffic, and convert it into orders + leads — without renting visibility from marketplaces.
                    </p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-[13px] text-green-800 max-w-[400px] mt-2.5">
                    <strong>Proof:</strong> Ultra Cannabis saw <strong>3× visibility</strong> and <strong>50+ orders in 90 days</strong> after launching our SEO + automation stack.
                </div>
            </div>

            <div id="cards" className={styles.pricingGrid}>
                {PRICING_PLANS.map(plan => (
                    <div
                        key={plan.name}
                        className={styles.planCard}
                        style={
                            plan.highlight
                                ? { border: '2px solid #16a34a', position: 'relative', overflow: 'hidden' }
                                : plan.id === 'free'
                                    ? { border: '2px dashed #94a3b8', background: '#f8fafc' }
                                    : undefined
                        }
                    >
                        <div className="text-xs tracking-widest uppercase text-gray-500">
                            {plan.priceDisplay}{' '}
                            <span className="normal-case text-gray-500 font-normal">{plan.period}</span>
                            {plan.id === 'free' && (
                                <span className="ml-2 text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-semibold">
                                    No credit card
                                </span>
                            )}
                        </div>

                        <div className="text-lg font-bold text-slate-950 mb-1">{plan.name}</div>

                        {plan.setup && (
                            <div className="text-[11px] text-gray-500 italic mb-3">{plan.setup}</div>
                        )}

                        <div className="self-start mb-3 text-[10px] px-1.5 py-0.5 rounded-full bg-green-600/[0.08] border border-green-600/45 text-green-900 inline-block">
                            {plan.pill}
                        </div>

                        <ul className="text-[11px] text-gray-500 pl-4 mb-4 flex-1 list-disc space-y-0.5">
                            {plan.features.map(f => <li key={f}>{f}</li>)}
                        </ul>

                        <Link
                            href={getPlanCtaHref(plan.id)}
                            className={`mt-auto flex items-center justify-center rounded-lg p-2.5 text-[11px] font-medium transition-colors ${
                                plan.highlight
                                    ? 'bg-slate-950 text-white hover:bg-slate-800'
                                    : 'border border-slate-200 text-slate-950 hover:bg-slate-50'
                            }`}
                        >
                            {plan.id === 'free'
                                ? 'Start Free'
                                : plan.id === 'enterprise' || plan.id === 'optimize'
                                    ? 'Talk to Sales'
                                    : `Start ${plan.name}`}
                        </Link>
                    </div>
                ))}
            </div>

            {/* ZIP Expansion */}
            <div className="mt-10 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="text-base font-bold mb-1">Need more ZIP coverage? Add ZIPs to any plan.</h3>
                <p className="text-[13px] text-slate-500 mb-4">
                    Convert includes <strong>3 ZIPs</strong> · Retain includes <strong>10 ZIPs</strong> · Optimize includes <strong>unlimited ZIPs</strong>
                </p>

                <div className="flex gap-4 flex-wrap mb-4">
                    {(() => {
                        const zipRow = OVERAGES_TABLE.find(r => r.k === 'Additional ZIP Codes');
                        if (!zipRow) return null;
                        return [
                            { label: 'Convert', rate: zipRow.convert },
                            { label: 'Retain', rate: zipRow.retain },
                            { label: 'Optimize', rate: zipRow.optimize },
                        ].map(({ label, rate }) => (
                            <div key={label} className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-5 py-3">
                                <span className="font-bold">{label}</span>
                                <span className="text-slate-500">{rate} per ZIP</span>
                            </div>
                        ));
                    })()}
                </div>

                <p className="text-xs text-slate-500 italic">
                    &ldquo;Perfect for brands carried across multiple metros — pay for coverage, not vague &lsquo;visibility.&rsquo;&rdquo;
                </p>
            </div>

            {/* Fine Print */}
            <div className="mt-6 text-[11px] text-slate-400 text-center space-y-0.5">
                <p>• <strong>Convert features are included inside Retain + Optimize</strong> (no double-charging to claim).</p>
                <p>• Compliance guardrails apply by market (Deebo pre-checks public copy + CTAs).</p>
            </div>
        </section>
    );
}
