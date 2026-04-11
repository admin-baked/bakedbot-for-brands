import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import { AuditLeadFlowPage } from '@/components/audit/audit-lead-flow-page';

export const metadata: Metadata = {
    title: 'AI Retention Audit for Dispensaries | BakedBot AI',
    description:
        'See where customer capture breaks, whether your welcome flow is launch-ready, and what is blocking repeat revenue on your dispensary site.',
    alternates: { canonical: 'https://bakedbot.ai/ai-retention-audit' },
};

export default async function AiRetentionAuditPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const initialUrl = typeof params.url === 'string' ? decodeURIComponent(params.url) : '';
    const utmSource = typeof params.utm_source === 'string' ? params.utm_source : undefined;
    const utmMedium = typeof params.utm_medium === 'string' ? params.utm_medium : undefined;
    const utmCampaign = typeof params.utm_campaign === 'string' ? params.utm_campaign : undefined;
    const utmContent = typeof params.utm_content === 'string' ? params.utm_content : undefined;

    return (
        <div className="min-h-screen flex flex-col pt-16 bg-background text-foreground">
            <Navbar />

            <main className="flex-1 mx-auto max-w-2xl px-4 py-10 space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AI Retention Audit</h1>
                    <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
                        Analyze your site for customer capture gaps, welcome-flow readiness, conversion friction, retention depth,
                        and compliance trust in about 20 seconds.
                    </p>
                </div>

                <AuditLeadFlowPage
                    initialUrl={initialUrl}
                    utm={{ source: utmSource, medium: utmMedium, campaign: utmCampaign, content: utmContent }}
                />

                <p className="text-center text-xs text-muted-foreground">
                    No credit card. No account. Powered by{' '}
                    <Link href="/" className="underline underline-offset-2">BakedBot AI</Link>.
                </p>
            </main>

            <LandingFooter />
        </div>
    );
}
