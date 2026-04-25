import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Key, Zap, ShieldCheck, Webhook } from 'lucide-react';
import RedocWidget from './redoc-client';

export const metadata: Metadata = {
    title: 'BakedBot Developer API — POS & Loyalty Integration for Cannabis Dispensaries',
    description:
        'Connect your POS system to BakedBot\'s retention and loyalty engine. REST API for transaction webhooks, member enrollment, loyalty lookups, and cannabis compliance checks. Built for Dutchie, Alleaves, Treez, and more.',
    openGraph: {
        title: 'BakedBot Developer API — POS & Loyalty Integration',
        description:
            'BakedBot\'s REST API connects cannabis POS systems to automated retention campaigns, loyalty programs, and compliance checks. Request API access to get started.',
        url: 'https://bakedbot.ai/developers',
        type: 'website',
    },
    alternates: { canonical: 'https://bakedbot.ai/developers' },
    robots: { index: true, follow: true },
};

const endpoints = [
    {
        method: 'POST',
        path: '/api/v1/integrations/pos/transactions/completed',
        summary: 'Record a completed POS transaction',
        description: 'Award loyalty points and trigger retention campaigns when a sale closes.',
        scope: 'write:transactions',
        color: 'bg-emerald-100 text-emerald-800',
    },
    {
        method: 'POST',
        path: '/api/v1/loyalty/members',
        summary: 'Enroll a customer in loyalty',
        description: 'Create a loyalty member and return a QR pass for immediate use at checkout.',
        scope: 'write:members',
        color: 'bg-emerald-100 text-emerald-800',
    },
    {
        method: 'GET',
        path: '/api/v1/loyalty/members/lookup',
        summary: 'Look up a loyalty profile',
        description: 'Retrieve points balance, tier, rewards, and pass details by phone or member ID.',
        scope: 'read:customers',
        color: 'bg-blue-100 text-blue-800',
    },
    {
        method: 'POST',
        path: '/api/v1/compliance/check',
        summary: 'Check content for compliance violations',
        description: 'Validate promotional copy against cannabis advertising rules before display.',
        scope: 'compliance:check',
        color: 'bg-emerald-100 text-emerald-800',
    },
];

const useCases = [
    {
        icon: Webhook,
        title: 'Transaction webhook',
        description: 'Fire a POST on every completed sale. BakedBot awards points, closes the loyalty session, and queues retention campaigns automatically.',
    },
    {
        icon: Key,
        title: 'Checkout loyalty lookup',
        description: 'Customers tap their phone number at checkout. Look up their points, tier, and active rewards in real time to apply discounts.',
    },
    {
        icon: Zap,
        title: 'Automated campaigns',
        description: 'Transaction data feeds BakedBot\'s segmentation engine. Lapsed customers, loyalty milestones, and product replenishment triggers fire without manual setup.',
    },
    {
        icon: ShieldCheck,
        title: 'Compliance at the source',
        description: 'Run any promotional copy through Deebo before displaying it — state-level cannabis advertising rules, checked in under 500ms.',
    },
];

export default function DevelopersPage() {
    return (
        <div className="min-h-screen bg-background">

            {/* ── Hero (server-rendered, crawlable) ─────────────────────────── */}
            <section className="border-b border-border/40 bg-gradient-to-b from-emerald-50/50 to-background">
                <div className="container mx-auto px-4 py-16 max-w-5xl">
                    <div className="max-w-3xl">
                        <Badge variant="outline" className="mb-4 bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            Partner API · v1
                        </Badge>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5 leading-tight">
                            BakedBot Developer API
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                            Connect your cannabis POS or e-commerce platform to BakedBot&apos;s retention and loyalty engine.
                            Send completed transactions, enroll customers, look up loyalty profiles, and run compliance
                            checks — all over a REST API secured with org-scoped API keys.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                <Link href="/contact?subject=api-access">
                                    Request API access <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <a href="/openapi.yaml" download>
                                    Download OpenAPI spec
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Quick facts (server-rendered, crawlable) ───────────────────── */}
            <section className="border-b border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-10 max-w-5xl">
                    <dl className="grid sm:grid-cols-4 gap-6 text-sm">
                        {[
                            { label: 'Base URL', value: 'bakedbot.ai' },
                            { label: 'Version', value: 'v1' },
                            { label: 'Auth', value: 'Bearer token' },
                            { label: 'Format', value: 'JSON' },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex flex-col gap-1">
                                <dt className="text-muted-foreground font-medium">{label}</dt>
                                <dd className="font-mono font-semibold">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            {/* ── Use cases (server-rendered, crawlable) ─────────────────────── */}
            <section className="border-b border-border/40">
                <div className="container mx-auto px-4 py-14 max-w-5xl">
                    <h2 className="text-2xl font-bold mb-2">What you can build</h2>
                    <p className="text-muted-foreground mb-10 text-sm">
                        The BakedBot API is designed for cannabis POS and e-commerce platforms. Here are the most
                        common integration patterns.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-8">
                        {useCases.map((uc) => (
                            <div key={uc.title} className="flex gap-4">
                                <uc.icon className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                                <div>
                                    <h3 className="font-semibold mb-1">{uc.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{uc.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Endpoint overview (server-rendered, crawlable) ─────────────── */}
            <section className="border-b border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-14 max-w-5xl">
                    <h2 className="text-2xl font-bold mb-2">API endpoints</h2>
                    <p className="text-muted-foreground mb-8 text-sm">
                        All endpoints are under <code className="text-xs bg-muted px-1.5 py-0.5 rounded">https://bakedbot.ai/api/v1</code>.
                        Each requires a Bearer token with the listed permission scope.
                    </p>
                    <div className="space-y-3">
                        {endpoints.map((ep) => (
                            <div key={ep.path} className="flex flex-col sm:flex-row sm:items-start gap-3 rounded-lg border bg-background p-4">
                                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-mono font-bold shrink-0 ${ep.color}`}>
                                    {ep.method}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <code className="text-sm font-mono text-foreground break-all">{ep.path}</code>
                                    <p className="text-sm font-semibold mt-0.5">{ep.summary}</p>
                                    <p className="text-sm text-muted-foreground mt-0.5">{ep.description}</p>
                                </div>
                                <span className="inline-flex items-center shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-700">
                                    {ep.scope}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Auth explainer (server-rendered, crawlable) ────────────────── */}
            <section className="border-b border-border/40">
                <div className="container mx-auto px-4 py-14 max-w-5xl">
                    <h2 className="text-2xl font-bold mb-4">Authentication</h2>
                    <div className="grid sm:grid-cols-2 gap-10">
                        <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">
                            <p>
                                Every request must include an <strong className="text-foreground">Authorization</strong> header
                                with a Bearer token issued by BakedBot.
                            </p>
                            <p>
                                Keys are scoped per organization and per permission. A key issued for one dispensary
                                cannot read or write data for another. Keys are provisioned by the BakedBot team during onboarding.
                            </p>
                            <p>
                                <Link href="/contact?subject=api-access" className="text-emerald-600 underline underline-offset-2">
                                    Request API access →
                                </Link>
                            </p>
                        </div>
                        <div className="rounded-lg bg-zinc-900 p-4">
                            <pre className="text-sm text-zinc-100 font-mono overflow-x-auto whitespace-pre-wrap">{`Authorization: Bearer bb_live_<your_key>

# Example: record a completed transaction
curl -X POST https://bakedbot.ai/api/v1/integrations/pos/transactions/completed \\
  -H "Authorization: Bearer bb_live_abc123" \\
  -H "Content-Type: application/json" \\
  -d '{
    "organizationId": "org_your_dispensary",
    "posTransactionRef": "txn_98765",
    "totalCents": 8500,
    "subtotalCents": 8500
  }'`}</pre>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Interactive Redoc docs (client-rendered) ───────────────────── */}
            <section className="border-t border-border/40">
                <div className="container mx-auto px-4 py-10 max-w-5xl">
                    <h2 className="text-2xl font-bold mb-2">Interactive reference</h2>
                    <p className="text-muted-foreground mb-8 text-sm">
                        Full request and response schemas with live examples. Use the sidebar to jump to any endpoint.
                    </p>
                </div>
                <RedocWidget />
            </section>

            {/* ── Footer CTA (server-rendered, crawlable) ────────────────────── */}
            <section className="border-t border-border/40 bg-muted/20">
                <div className="container mx-auto px-4 py-14 max-w-3xl text-center">
                    <h2 className="text-2xl font-bold mb-3">Ready to integrate?</h2>
                    <p className="text-muted-foreground mb-8 text-sm">
                        Contact the BakedBot team to get an org-scoped API key. We&apos;ll walk you through the
                        onboarding flow and have your first transaction flowing within a day.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                            <Link href="/contact?subject=api-access">
                                Request API access <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg">
                            <a href="mailto:martez@bakedbot.ai">Email us directly</a>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
