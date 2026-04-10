import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import { AuditLeadFlowPage } from '@/components/audit/audit-lead-flow-page';

export const metadata: Metadata = {
    title: 'Free Cannabis Marketing Audit | BakedBot AI',
    description:
        'Get an AI-powered audit of your cannabis brand or dispensary website — content, SEO, compliance, conversion, and competitive positioning in 20 seconds.',
    alternates: { canonical: 'https://bakedbot.ai/free-audit' },
};

export default async function FreeAuditPage({
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
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Free Marketing Audit</h1>
                    <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                        Our AI analyzes your cannabis website across 5 marketing dimensions — content, conversion, SEO, competitive positioning, and compliance — in about 20 seconds.
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
