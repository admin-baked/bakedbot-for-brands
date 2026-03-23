'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PUBLIC_PLANS, FREE_AUDIT, ADDONS, OVERAGES_TABLE } from '@/lib/config/pricing';

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
                <div className="inline-flex items-center rounded-2xl border border-border bg-muted/30 p-1 sm:p-1.5 backdrop-blur-sm max-w-full">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setActive(t.key)}
                            className={
                                "px-3 py-2 text-xs sm:px-6 sm:text-sm font-medium rounded-xl transition-all duration-200 " +
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
    return `$${Math.round(value).toLocaleString()}`;
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

const isHighlighted = (badge?: string, highlight?: string | boolean) =>
    badge === "Best Value" || badge === "Most Popular" || highlight === true;

// Engine descriptions for the "What's Included" tab
const ENGINE_DESCRIPTIONS = [
    {
        name: "Commerce Engine",
        desc: "The core of every paid plan. Smokey handles product recommendations, real-time inventory sync, and guided browsing. Combined with SEO-first menu pages, the Commerce Engine turns your digital presence into an active sales channel.",
        plans: "Convert, Retain, Optimize",
    },
    {
        name: "Retention Engine",
        desc: "Available from Retain onward. Craig and Mrs. Parker run lifecycle campaigns, loyalty programs, and CRM workflows that bring buyers back. Includes playbooks, segmentation, QR capture, and Deebo-reviewed outbound campaigns.",
        plans: "Retain, Optimize",
    },
    {
        name: "Intelligence Engine",
        desc: "Available from Signal onward. Ezal monitors competitor pricing and menu activity across your market. Pops surfaces demand signals, ZIP-level insights, and weekly digests — so you know what's changing before your competitors do.",
        plans: "Signal, Convert, Retain, Optimize",
    },
    {
        name: "Optimization Engine",
        desc: "Available on Optimize. Money Mike connects profitability data to pricing decisions. Get executive-level digests, margin analysis, deep research workflows, and competitive price alerts — all routed through a single dashboard.",
        plans: "Optimize",
    },
    {
        name: "Compliance Layer",
        desc: "Deebo runs on every plan and every engine. Pre-flight checks on all campaigns, content guardrails on menus and messaging, immutable audit trails, and jurisdiction-aware rule packs.",
        plans: "All plans",
    },
];

export function PricingClient() {
    const tabs = useMemo(() => [
        {
            key: "tiers",
            label: "Plans",
            content: (
                <div>
                    {/* Free Audit entry card */}
                    <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-6 py-5">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl font-bold font-teko tracking-wide">{FREE_AUDIT.price}</span>
                                <Badge variant="secondary" className="text-xs">No account needed</Badge>
                            </div>
                            <p className="font-semibold text-foreground">{FREE_AUDIT.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {FREE_AUDIT.includes.join(' · ')}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0 rounded-xl" asChild>
                            <a href={FREE_AUDIT.href}>{FREE_AUDIT.cta}</a>
                        </Button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                        {PUBLIC_PLANS.map((t) => {
                            const highlighted = isHighlighted(t.badge, t.highlight);
                            return (
                                <Card
                                    key={t.name}
                                    className={`flex flex-col relative overflow-hidden transition-all duration-300 hover:scale-[1.02] border-border/60 ${
                                        highlighted
                                            ? "border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                                            : "hover:border-foreground/20"
                                    }`}
                                >
                                    {highlighted && (
                                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                                    )}

                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <CardTitle className="text-xl font-bold">{t.name}</CardTitle>
                                            {t.badge && (
                                                <Badge
                                                    variant={highlighted ? "default" : "secondary"}
                                                    className={highlighted ? "bg-emerald-600 hover:bg-emerald-700 text-white text-xs" : "text-xs"}
                                                >
                                                    {t.badge}
                                                </Badge>
                                            )}
                                        </div>
                                        {t.tagline && (
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.tagline}</p>
                                        )}
                                        <CardDescription className="text-sm mt-2 min-h-[48px]">
                                            {t.desc}
                                        </CardDescription>
                                        <div className="mt-4">
                                            <Price value={t.price} />
                                            {t.activationFee && (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    + {formatMoney(t.activationFee)} activation
                                                </p>
                                            )}
                                            {t.price !== null && !t.activationFee && (
                                                <p className="mt-1 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                                    {t.includedCredits ? `${t.includedCredits.toLocaleString()} Credits Included` : 'Custom Credits'}
                                                </p>
                                            )}
                                            {t.price !== null && !t.activationFee && (
                                                <p className="mt-1 text-xs text-muted-foreground">billed monthly</p>
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
                                            className={`w-full h-11 text-base font-semibold transition-all duration-300 ${
                                                highlighted
                                                    ? "bg-foreground text-background hover:opacity-90 shadow-lg hover:shadow-xl"
                                                    : "bg-foreground text-background hover:opacity-90"
                                            }`}
                                            asChild
                                        >
                                            <a href={t.pillHref ?? `/onboarding?plan=${t.id}`}>
                                                {t.pill}
                                            </a>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-muted-foreground bg-muted/30 inline-block px-4 py-2 rounded-full border border-border/50">
                            💡 Every plan includes a usage allowance. Transparent overages apply if you exceed limits — see the Usage & Add-Ons tab.
                        </p>
                    </div>

                    {/* Social Equity Callout */}
                    <div className="mt-10 flex items-center gap-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 px-6 py-5">
                        <span className="text-2xl shrink-0">✊</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">Social Equity Access</p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Licensed social equity operators receive discounted access. Contact us for eligibility.
                            </p>
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0 border-purple-500/30 text-purple-700 dark:text-purple-400 hover:bg-purple-500/10" asChild>
                            <a href="/social-equity">Apply →</a>
                        </Button>
                    </div>
                </div>
            ),
        },
        {
            key: "whats-included",
            label: "What's Included",
            content: (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="text-center mb-10 space-y-2">
                        <p className="text-muted-foreground">
                            BakedBot is organized into five engines. Each plan unlocks a different set. Here's what each one does.
                        </p>
                    </div>
                    {ENGINE_DESCRIPTIONS.map((engine) => (
                        <Card key={engine.name} className="border-border/60">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-4">
                                    <CardTitle className="text-lg font-bold">{engine.name}</CardTitle>
                                    <Badge variant="secondary" className="text-xs shrink-0 mt-0.5">{engine.plans}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground leading-relaxed">{engine.desc}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ),
        },
        {
            key: "usage",
            label: "Usage & Add-Ons",
            content: (
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8 text-center space-y-2">
                        <p className="text-muted-foreground">
                            Every plan includes a usage allowance. You'll be notified at 80% — no throttling, no surprise bills.{" "}
                            <span className="font-medium text-foreground">Pay only for what you use above your limit.</span>
                        </p>
                    </div>

                    <Card className="border-border/60 shadow-sm mb-10">
                        <CardHeader>
                            <CardTitle className="text-xl">Transparent Overage Rates</CardTitle>
                            <CardDescription>
                                Pay only for what you use above your plan limits.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border/50">
                                            <th className="text-left py-3 pr-6 font-semibold text-foreground">Usage Type</th>
                                            <th className="text-center py-3 px-4 font-semibold text-foreground">Signal</th>
                                            <th className="text-center py-3 px-4 font-semibold text-foreground">Convert</th>
                                            <th className="text-center py-3 px-4 font-semibold text-foreground">Retain</th>
                                            <th className="text-center py-3 px-4 font-semibold text-foreground">Optimize</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {OVERAGES_TABLE.map((row) => (
                                            <tr key={row.k} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                                                <td className="py-3 pr-6 font-medium text-foreground">{row.k}</td>
                                                <td className="py-3 px-4 text-center text-muted-foreground">{row.signal}</td>
                                                <td className="py-3 px-4 text-center text-muted-foreground">{row.convert}</td>
                                                <td className="py-3 px-4 text-center text-muted-foreground">{row.retain}</td>
                                                <td className="py-3 px-4 text-center">
                                                    {row.optimize === "Included" ? (
                                                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Included</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">{row.optimize}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="mt-6 text-sm text-muted-foreground text-center">
                                Internal staff alerts (price drops, compliance flags) are unlimited on all paid tiers and separate from customer SMS allocations.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Add-Ons */}
                    <div className="mb-6">
                        <h4 className="font-semibold text-base mb-2">Agent Modules & Add-Ons</h4>
                        <p className="text-sm text-muted-foreground mb-6">
                            Some engines are available as add-ons on lower tiers before they're included in higher ones.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50">
                                    <th className="text-left py-3 px-4 font-semibold text-foreground">Module</th>
                                    <th className="text-center py-3 px-4 font-semibold text-foreground">Price</th>
                                    <th className="text-left py-3 px-4 font-semibold text-foreground">What You Get</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ADDONS.map((a) => (
                                    <tr key={a.name} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="font-semibold text-foreground">{a.name}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">{a.note}</div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            {a.price === 0 ? (
                                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Included</Badge>
                                            ) : (
                                                <span className="font-bold text-foreground">+${a.price}/mo</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-muted-foreground">{a.desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
