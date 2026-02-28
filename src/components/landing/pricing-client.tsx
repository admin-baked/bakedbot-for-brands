'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PRICING_PLANS, ADDONS, OVERAGES_TABLE } from '@/lib/config/pricing';

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

const isHighlighted = (badge?: string, highlight?: string | boolean) =>
    badge === "Best Value" || badge === "Most Popular" || highlight === true;

export function PricingClient() {
    const tabs = useMemo(() => [
        {
            key: "tiers",
            label: "Plans",
            content: (
                <div>
                    {/* EARLYBIRD50 Promo Banner */}
                    <div className="mb-8 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
                        <span className="text-lg">🚀</span>
                        <p className="text-sm text-emerald-700 dark:text-emerald-400">
                            <span className="font-semibold">Early Adopter Program</span> — First 50 dispensaries get 3 months free on any paid plan.{" "}
                            Use code <span className="font-mono font-bold">EARLYBIRD50</span> at signup.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {PRICING_PLANS.map((t) => {
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
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <CardTitle className="text-xl font-bold">{t.name}</CardTitle>
                                            {t.badge && (
                                                <Badge
                                                    variant={highlighted ? "default" : "secondary"}
                                                    className={highlighted ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                                                >
                                                    {t.badge}
                                                </Badge>
                                            )}
                                        </div>
                                        <CardDescription className="min-h-[40px]">
                                            {typeof t.highlight === 'string' ? t.highlight : t.desc}
                                        </CardDescription>
                                        <div className="mt-6">
                                            <Price value={t.price} />
                                            {t.price !== null && t.price > 0 && (
                                                <p className="mt-1 text-xs text-muted-foreground">billed monthly</p>
                                            )}
                                            {t.price === 0 && (
                                                <p className="mt-1 text-xs text-muted-foreground">free forever</p>
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
                                            <a href={t.id === "empire" ? "/get-started?plan=empire" : t.id === "scout" ? "/get-started" : `/get-started?plan=${t.id}`}>
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
                            💡 Every plan includes a usage allowance. Transparent overages apply if you exceed limits — see the Overages tab.
                        </p>
                    </div>

                    {/* Social Equity Callout */}
                    <div className="mt-10 flex items-center gap-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 px-6 py-5">
                        <span className="text-2xl shrink-0">✊</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">Built for Equity, Priced for Access</p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Licensed social equity dispensaries get 50% off any plan. Same tools. Same support. Half the price.
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
            key: "addons",
            label: "Add-Ons",
            content: (
                <div>
                    <div className="mb-8 p-6 bg-gradient-to-br from-muted/50 to-muted/10 rounded-2xl border border-border/60 text-center max-w-3xl mx-auto">
                        <h4 className="font-semibold mb-2 text-base">Agent Modules</h4>
                        <p className="text-muted-foreground text-sm">
                            Craig and Deebo are included in Pro+. Ezal and Big Worm are paid add-ons on Pro/Growth — included in Empire.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50">
                                    <th className="text-left py-3 px-4 font-semibold text-foreground">Add-On</th>
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
        {
            key: "overages",
            label: "Overages",
            content: (
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8 text-center space-y-2">
                        <p className="text-muted-foreground">
                            Every plan includes a generous usage allowance. If you go over, you only pay for what you use —
                            no surprise bills, no throttling. <span className="font-medium text-foreground">We'll notify you at 80% so there are no surprises.</span>
                        </p>
                    </div>
                    <Card className="border-border/60 shadow-sm">
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
                                            <th className="text-center py-3 px-4 font-semibold text-foreground">Pro</th>
                                            <th className="text-center py-3 px-4 font-semibold text-foreground">Growth</th>
                                            <th className="text-center py-3 px-4 font-semibold text-foreground">Empire</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {OVERAGES_TABLE.map((row) => (
                                            <tr key={row.k} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                                                <td className="py-3 pr-6 font-medium text-foreground">{row.k}</td>
                                                <td className="py-3 px-4 text-center text-muted-foreground">{row.pro}</td>
                                                <td className="py-3 px-4 text-center text-muted-foreground">{row.growth}</td>
                                                <td className="py-3 px-4 text-center">
                                                    {row.empire === "Included" ? (
                                                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Included</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">{row.empire}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="mt-6 text-sm text-muted-foreground text-center">
                                Internal staff SMS alerts (Ezal price drops, compliance flags) are unlimited on all paid tiers and separate from customer SMS allocations.
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
