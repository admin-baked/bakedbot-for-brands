import type { Metadata } from 'next';
import Link from 'next/link';
import Logo from '@/components/logo';
import { AuditLeadFlowPage } from '@/components/audit/audit-lead-flow-page';

export const metadata: Metadata = {
    title: 'Free Cannabis Marketing Audit | BakedBot AI',
    description: 'Get an AI-powered audit of your cannabis brand or dispensary website — content, SEO, compliance, conversion, and competitive positioning in 20 seconds.',
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
        <div className="min-h-screen bg-background text-foreground">
            {/* Minimal header */}
            <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
                    <Link href="/">
                        <Logo height={28} />
                    </Link>
                    <Link
                        href="/get-started"
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Book a Demo →
                    </Link>
                </div>
            </header>

            {/* Page content */}
            <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
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
        </div>
    );
}
