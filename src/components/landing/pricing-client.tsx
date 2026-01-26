'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PRICING_PLANS, ADDONS, OVERAGES } from '@/lib/config/pricing';

// Type definitions for component props
type Tier = {
    name: string;
    badge: string;
    priceLaunch: number | null;
    priceLater: number | null;
    highlight: string;
    includes: string[];
    price: number | null; // Added for flat mapping
    desc: string; // Added
    features: string[]; // Added
    pill: string; // Added
};

// Simplified Tab Component
function PricingTabs({
    tabs,
    initial,
}: {
    tabs: { key: string; label: string; content: React.ReactNode }[];
    initial: string;
}) {
    const [active, setActive] = useState(initial);
    const activeTab = useMemo(() => tabs.find((t) => t.key === active) ?? tabs[0], [tabs, active]);

    return (
        <div>
            <div className="flex justify-center mb-8">
                <div className="inline-flex items-center rounded-2xl border border-border bg-muted/30 p-1.5 backdrop-blur-sm">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setActive(t.key)}
                            className={
                                "px-6 py-2 text-sm font-medium rounded-xl transition-all duration-200 " +
                                (t.key === active
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60")
                            }
                            type="button"
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab?.content}
            </div>
        </div>
    );
}

function formatMoney(value: number) {
    if (!Number.isFinite(value)) return "";
    return `$${Math.round(value)}`;
}

function Price({ value }: { value: number | null }) {
    if (value === null) return <span className="text-4xl font-semibold font-teko tracking-wide">Custom</span>;
    return (
        <div className="flex items-end gap-1">
            <span className="text-5xl font-bold font-teko tracking-wide">{formatMoney(value)}</span>
            <span className="text-sm text-muted-foreground pb-2 font-medium">/mo</span>
        </div>
    );
}

export function PricingClient() {
    const tabs = useMemo(() => [
        {
            key: "tiers",
            label: "Plans",
            content: (
                <div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {PRICING_PLANS.map((t) => (
                            <Card key={t.name} className={`flex flex-col relative overflow-hidden transition-all duration-300 hover:scale-[1.02] border-border/60 ${t.badge === "Most Popular" ? "border-emerald-500/50 shadow-lg shadow-emerald-500/5" : "hover:border-foreground/20"}`}>
                                {t.badge === "Most Popular" && (
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                                )}

                                <CardHeader>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <CardTitle className="text-xl font-bold">{t.name}</CardTitle>
                                        {t.badge && (
                                            <Badge variant={t.badge === "Most Popular" ? "default" : "secondary"} className={t.badge === "Most Popular" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                                                {t.badge}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardDescription className="min-h-[40px]">
                                        {typeof t.highlight === 'string' ? t.highlight : t.desc}
                                    </CardDescription>
                                    <div className="mt-6">
                                        {t.name === "Enterprise" ? (
                                            <Price value={null} />
                                        ) : (
                                            <div>
                                                <Price value={t.price} />
                                                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                                                    <span className="line-through opacity-70">{formatMoney(t.priceLater ?? 0)}/mo</span>
                                                    <span className="font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">Launch Price</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <Separator className="mb-6 opacity-50" />
                                    <ul className="space-y-3 text-sm">
                                        {t.features.map((inc) => (
                                            <li key={inc} className="flex gap-3 items-start group">
                                                <span className="mt-0.5 shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/20 transition-colors">
                                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M9 1L3.5 6.5L1 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </span>
                                                <span className="text-muted-foreground group-hover:text-foreground transition-colors">{inc}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter className="mt-auto pt-6">
                                    <Button
                                        className={`w-full h-11 text-base font-semibold transition-all duration-300 ${t.name === "Enterprise" ? "bg-muted text-foreground hover:bg-muted/80" : "bg-foreground text-background hover:opacity-90 shadow-lg hover:shadow-xl"}`}
                                        asChild
                                        href={t.name === "Enterprise" ? "/contact" : "/get-started"}
                                    >
                                        <a href={t.name === "Enterprise" ? "/contact" : "/get-started"}>
                                            {t.name === "Enterprise" ? "Talk to Sales" : t.pill}
                                        </a>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-muted-foreground bg-muted/30 inline-block px-4 py-2 rounded-full border border-border/50">
                            💡 Launch pricing includes a monthly usage allowance. If you exceed limits, transparent overages apply (see Overages tab).
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: "addons",
            label: "Add-ons",
            content: (
                <div>
                    <div className="mb-8 p-6 bg-gradient-to-br from-muted/50 to-muted/10 rounded-2xl border border-border/60 text-center max-w-3xl mx-auto">
                        <h4 className="font-semibold mb-2 text-base">Agent Workspace Add-ons</h4>
                        <p className="text-muted-foreground">
                            Add specialized AI agents as your team grows. They plug into the same data and share your monthly usage allowance.
                        </p>
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {ADDONS.map((a) => (
                            <Card key={a.name} className="hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                                <CardHeader>
                                    <CardTitle className="text-lg font-bold">{a.name}</CardTitle>
                                    <CardDescription className="min-h-[40px]">{a.note}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-end gap-1 mb-4">
                                        <span className="text-4xl font-bold font-teko">{formatMoney(a.price)}</span>
                                        <span className="text-sm text-muted-foreground pb-2">/mo</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {a.desc}
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="outline" className="w-full hover:bg-primary/5 hover:text-primary hover:border-primary/30" asChild href="/get-started">
                                        <a href="/get-started">Add to Plan</a>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            ),
        },
        {
            key: "overages",
            label: "Overages",
            content: (
                <div className="max-w-4xl mx-auto">
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl">Transparent Usage Rates</CardTitle>
                            <CardDescription>
                                Pay only for what you use above your plan limits. No throttling, ever.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {OVERAGES.map((o) => (
                                    <div key={o.k} className="rounded-xl border border-border/50 bg-muted/20 p-5 flex flex-col justify-between hover:bg-muted/40 transition-colors">
                                        <div>
                                            <div className="font-semibold text-foreground">{o.k}</div>
                                            <div className="text-2xl font-bold text-emerald-600 mt-2 font-teko tracking-wide">{o.v}</div>
                                        </div>
                                        {o.unit && <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">{o.unit}</div>}
                                    </div>
                                ))}
                            </div>
                            <p className="mt-6 text-sm text-muted-foreground text-center">
                                You'll always see your projected bill in real-time on your dashboard.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            ),
        },
    ], []);

    return (
        <PricingTabs
            initial="tiers"
            tabs={tabs}
        />
    );
}
