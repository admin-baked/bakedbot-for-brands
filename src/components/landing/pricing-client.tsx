'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import {
    ACCESS_PLANS,
    ADDONS,
    AI_RETENTION_AUDIT,
    OPERATOR_PLANS,
    OVERAGES_TABLE,
    type PricingPlan,
} from '@/lib/config/pricing';

function PriceBlock({ plan }: { plan: PricingPlan }) {
    if (plan.price === null) {
        return <div className="text-4xl font-bold tracking-tight">{plan.priceDisplay}</div>;
    }

    const isStartingAt = ['access_retention', 'operator_core', 'operator_growth'].includes(plan.id);

    return (
        <div className="space-y-1">
            <div className="flex items-end gap-2">
                <span className="text-4xl font-bold tracking-tight">
                    {isStartingAt ? `Starting at ${plan.priceDisplay}` : plan.priceDisplay}
                </span>
                <span className="pb-1 text-sm text-muted-foreground">{plan.period}</span>
            </div>
            {plan.activationFee ? (
                <p className="text-xs text-muted-foreground">Setup from ${plan.activationFee.toLocaleString()}</p>
            ) : null}
        </div>
    );
}

function PlanCard({ plan }: { plan: PricingPlan }) {
    const isOperator = plan.track === 'operator';

    return (
        <Card
            className={`flex h-full flex-col border-border/60 ${
                isOperator
                    ? 'bg-slate-950 text-white shadow-xl shadow-slate-950/10'
                    : 'bg-background/90 shadow-sm'
            }`}
        >
            <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        {plan.tagline ? (
                            <p className={`mt-1 text-sm font-medium ${isOperator ? 'text-slate-300' : 'text-muted-foreground'}`}>
                                {plan.tagline}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {plan.badge ? (
                            <Badge variant={isOperator ? 'secondary' : 'outline'} className={isOperator ? 'bg-white/10 text-white border-white/15' : ''}>
                                {plan.badge}
                            </Badge>
                        ) : null}
                        {plan.salesMotion === 'consultative' ? (
                            <Badge variant="outline" className={isOperator ? 'border-emerald-400/40 text-emerald-200' : ''}>
                                Consultative
                            </Badge>
                        ) : null}
                    </div>
                </div>

                <PriceBlock plan={plan} />

                <CardDescription className={isOperator ? 'text-slate-300' : ''}>
                    {plan.desc}
                </CardDescription>

                {plan.kpiHighlights && plan.kpiHighlights.length > 0 ? (
                    <div className={`rounded-xl border px-4 py-3 ${isOperator ? 'border-white/10 bg-white/5' : 'border-border/60 bg-muted/30'}`}>
                        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isOperator ? 'text-slate-400' : 'text-muted-foreground'}`}>
                            KPI Pack
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {plan.kpiHighlights.map((kpi) => (
                                <Badge
                                    key={kpi}
                                    variant="outline"
                                    className={isOperator ? 'border-white/10 text-slate-100' : ''}
                                >
                                    {kpi}
                                </Badge>
                            ))}
                        </div>
                    </div>
                ) : null}
            </CardHeader>

            <CardContent className="flex-1 space-y-5">
                <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isOperator ? 'text-slate-400' : 'text-muted-foreground'}`}>
                        Includes
                    </p>
                    <ul className="mt-3 space-y-3 text-sm">
                        {plan.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-3">
                                <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${isOperator ? 'text-emerald-300' : 'text-emerald-600'}`} />
                                <span className={isOperator ? 'text-slate-100' : 'text-foreground'}>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>

            <CardFooter className="pt-0">
                <Button
                    asChild
                    className={`h-11 w-full text-base font-semibold ${
                        isOperator
                            ? 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'
                            : ''
                    }`}
                    variant={isOperator ? 'default' : 'outline'}
                >
                    <a href={plan.ctaHref}>
                        {plan.ctaLabel}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                </Button>
            </CardFooter>
        </Card>
    );
}

function LaneHeader({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <div className="space-y-3">
            <Badge variant="outline">{eyebrow}</Badge>
            <div>
                <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

export function PricingClient() {
    return (
        <div className="space-y-12">
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold tracking-tight">{AI_RETENTION_AUDIT.price}</span>
                            <Badge variant="secondary">No account needed</Badge>
                        </div>
                        <p className="font-semibold">{AI_RETENTION_AUDIT.title}</p>
                        <p className="text-sm text-muted-foreground">{AI_RETENTION_AUDIT.includes.join(' · ')}</p>
                    </div>
                    <Button variant="outline" asChild className="h-11 rounded-xl px-5">
                        <a href={AI_RETENTION_AUDIT.href}>{AI_RETENTION_AUDIT.cta}</a>
                    </Button>
                </div>
            </div>

            <section className="space-y-6">
                <LaneHeader
                    eyebrow="Access"
                    title="Start free. Capture customer data. Built for smaller operators."
                    description="Access is built for social equity dispensaries, smaller operators, and low-friction proof. These plans stay self-serve while giving teams a clear path into Operator when they need accountable execution."
                />
                <div className="grid gap-6 lg:grid-cols-3">
                    {ACCESS_PLANS.map((plan) => (
                        <PlanCard key={plan.id} plan={plan} />
                    ))}
                </div>
            </section>

            <section className="space-y-6">
                <LaneHeader
                    eyebrow="Operator"
                    title="Need more than software?"
                    description="BakedBot Operator is a managed revenue activation system. We own the launch plan, KPI pack, weekly reporting cadence, and the 30-60 day proof window with you."
                />
                <div className="grid gap-6 lg:grid-cols-3">
                    {OPERATOR_PLANS.map((plan) => (
                        <PlanCard key={plan.id} plan={plan} />
                    ))}
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>Secondary Modules</CardTitle>
                        <CardDescription>
                            Smokey, SEO menus, market intel, and profitability stay available, but they no longer define the primary pricing story.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {ADDONS.map((addon) => (
                            <div key={addon.name} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold">{addon.name}</p>
                                    <Badge variant="outline">{addon.note}</Badge>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">{addon.desc}</p>
                                <p className="mt-3 text-sm font-medium">
                                    {addon.price === 0 ? 'Included where noted' : `From $${addon.price}/mo`}
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>Usage and Overages</CardTitle>
                        <CardDescription>Transparent add-on and overage structure for the narrow wedge.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3 text-sm">
                            {OVERAGES_TABLE.map((row) => (
                                <div key={row.k} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                                    <p className="font-semibold">{row.k}</p>
                                    <div className="mt-2 grid gap-2 text-muted-foreground">
                                        <p>Access Intel: {row.accessIntel}</p>
                                        <p>Access Retention: {row.accessRetention}</p>
                                        <p>Operator Core: {row.operatorCore}</p>
                                        <p>Operator Growth: {row.operatorGrowth}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
