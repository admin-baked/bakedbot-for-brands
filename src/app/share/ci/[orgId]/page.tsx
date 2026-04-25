import { Metadata } from 'next';
import { getAdminFirestore } from '@/firebase/admin';
import { notFound } from 'next/navigation';

interface Props {
    params: { orgId: string };
}

async function getShareData(orgId: string) {
    try {
        const db = getAdminFirestore();
        const [orgDoc, reportSnap] = await Promise.all([
            db.collection('organizations').doc(orgId).get(),
            db.collection('tenants').doc(orgId).collection('weekly_reports')
                .orderBy('generatedAt', 'desc').limit(1).get(),
        ]);
        if (!orgDoc.exists) return null;
        const org = orgDoc.data()!;
        const report = reportSnap.empty ? null : reportSnap.docs[0].data();
        return { org, report };
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const data = await getShareData(params.orgId);
    if (!data) return { title: 'Competitive Intelligence — BakedBot AI' };
    const { org, report } = data;
    const gaps = report?.insights?.pricingGaps?.length || 0;
    const orgName = org.name || 'Dispensary';
    const description = gaps > 0
        ? `${gaps} price match opportunities identified for ${orgName}. Powered by BakedBot AI competitive intelligence.`
        : `Daily competitive intelligence report for ${orgName}. Powered by BakedBot AI.`;

    return {
        title: `${orgName} — Competitive Intel Report`,
        description,
        openGraph: {
            title: `${orgName}: ${gaps} Price Match Opportunities`,
            description,
            type: 'article',
            siteName: 'BakedBot AI',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${orgName} Competitive Intel`,
            description,
        },
    };
}

export default async function ShareCIPage({ params }: Props) {
    const data = await getShareData(params.orgId);
    if (!data) notFound();

    const { org, report } = data;
    const orgName = org.name || 'Simply Pure Trenton';
    const insights = report?.insights || {};
    const pricingGaps: Array<{ competitorName: string; productName: string; theirPrice: number; ourPrice: number; gap: number; action: string }> = insights.pricingGaps || [];
    const topDeals: Array<{ competitorName: string; productName: string; price: number; ourPrice: number; savings: number }> = insights.topDeals || [];
    const marketTrends: string[] = insights.marketTrends || [];
    const recommendations: string[] = insights.recommendations || [];
    const generatedAt = report?.generatedAt?.toDate?.() ?? new Date();
    const dateStr = generatedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return (
        <div style={{ background: '#0f0f1a', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#f0f0f0', padding: '0' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '32px 40px 24px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.8, marginBottom: '4px' }}>
                                Competitive Intelligence
                            </div>
                            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'white' }}>{orgName}</h1>
                            <div style={{ fontSize: '14px', opacity: 0.85, marginTop: '4px' }}>Ewing Township, NJ · {dateStr}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px 16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: 'white' }}>{pricingGaps.length}</div>
                            <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 600 }}>PRICE MATCH<br />OPPORTUNITIES</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>

                {/* Pricing Gaps — the money section */}
                {pricingGaps.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#f59e0b', marginBottom: '16px' }}>
                            ⚠️ Competitor Underpricing You
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {pricingGaps.map((gap, i) => (
                                <div key={i} style={{ background: '#1a1a2e', border: '1px solid #2d2d4a', borderLeft: '3px solid #f59e0b', borderRadius: '8px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#f0f0f0' }}>{gap.productName}</div>
                                        <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>{gap.competitorName}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>Them</div>
                                                <div style={{ fontWeight: 700, color: '#f87171', fontSize: '18px' }}>${gap.theirPrice}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>You</div>
                                                <div style={{ fontWeight: 700, color: '#f0f0f0', fontSize: '18px' }}>${gap.ourPrice}</div>
                                            </div>
                                            <div style={{ background: gap.action === 'beat' ? '#7f1d1d' : '#1e3a5f', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, color: gap.action === 'beat' ? '#fca5a5' : '#93c5fd', textTransform: 'uppercase' }}>
                                                {gap.action}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Where we're winning */}
                {topDeals.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#10b981', marginBottom: '16px' }}>
                            ✅ Where You're Winning
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                            {topDeals.slice(0, 4).map((deal, i) => (
                                <div key={i} style={{ background: '#1a1a2e', border: '1px solid #2d2d4a', borderLeft: '3px solid #10b981', borderRadius: '8px', padding: '12px 14px' }}>
                                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#f0f0f0', marginBottom: '4px' }}>{deal.productName}</div>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>vs {deal.competitorName}</div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '10px', color: '#6b7280' }}>You</div>
                                            <div style={{ fontWeight: 700, color: '#10b981' }}>${deal.ourPrice}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '10px', color: '#6b7280' }}>Them</div>
                                            <div style={{ fontWeight: 600, color: '#9ca3af' }}>${deal.price}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '10px', color: '#6b7280' }}>Advantage</div>
                                            <div style={{ fontWeight: 700, color: '#10b981' }}>+${deal.savings}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#818cf8', marginBottom: '16px' }}>
                            🎯 Recommended Actions
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {recommendations.map((rec, i) => (
                                <div key={i} style={{ background: '#1a1a2e', border: '1px solid #2d2d4a', borderRadius: '8px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ background: '#4f46e5', borderRadius: '50%', width: '22px', height: '22px', minWidth: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'white' }}>{i + 1}</div>
                                    <div style={{ fontSize: '14px', color: '#d1d5db', lineHeight: 1.5 }}>{rec}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Market Trends */}
                {marketTrends.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#60a5fa', marginBottom: '16px' }}>
                            📊 Market Trends
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {marketTrends.map((trend, i) => (
                                <div key={i} style={{ background: '#1a1a2e', border: '1px solid #2d2d4a', borderRadius: '8px', padding: '11px 14px', fontSize: '14px', color: '#d1d5db', lineHeight: 1.5 }}>
                                    {trend}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={{ borderTop: '1px solid #2d2d4a', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Generated by <strong style={{ color: '#10b981' }}>BakedBot AI</strong> · Competitive Intelligence Engine
                    </div>
                    <a href="https://bakedbot.ai" style={{ fontSize: '12px', color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>
                        bakedbot.ai →
                    </a>
                </div>
            </div>
        </div>
    );
}
