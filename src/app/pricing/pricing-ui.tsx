"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIRECTORY_PLANS, PLATFORM_PLANS, ADDONS, OVERAGES, PricingPlan } from "@/lib/config/pricing";

export function PricingUI() {
    return (
        <>
            <section className="py-20 px-4 text-center bg-gradient-to-b from-background to-muted/20">
                <div className="container mx-auto max-w-4xl">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                        Simple, Transparent Pricing
                    </h1>
                    <p className="text-xl text-muted-foreground mb-8 text-balance">
                        Start with discovery + claiming. Then add the Agent Workspace when you want automation, reporting, competitive intel, and compliance guardrails.
                    </p>

                    <div className="bg-card border rounded-xl p-6 md:p-8 text-left max-w-3xl mx-auto shadow-sm">
                        <h3 className="text-lg font-semibold mb-3">How it works</h3>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="bg-primary/10 p-1 rounded-full text-primary mt-0.5">
                                    <Check className="h-3 w-3" />
                                </span>
                                <span>
                                    <strong>Directory Plans</strong> get you discovered and let you claim your page.
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-primary/10 p-1 rounded-full text-primary mt-0.5">
                                    <Check className="h-3 w-3" />
                                </span>
                                <span>
                                    <strong>Agent Workspace</strong> powers ongoing tasks: daily intel, automated follow-ups, reporting, and compliance checks.
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="bg-primary/10 p-1 rounded-full text-primary mt-0.5">
                                    <Check className="h-3 w-3" />
                                </span>
                                <span>
                                    Usage is simple: plans include monthly allowances, and you can add coverage when you grow.
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="py-12 px-4 container mx-auto mb-20">
                <Tabs defaultValue="directory" className="space-y-8">
                    <div className="flex justify-center">
                        <TabsList className="grid w-full max-w-md grid-cols-2 h-12">
                            <TabsTrigger value="directory" className="text-base">Directory Plans</TabsTrigger>
                            <TabsTrigger value="platform" className="text-base">Platform Plans</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="directory" className="space-y-12 animate-in fade-in-50 duration-500">
                        <div className="text-center max-w-2xl mx-auto mb-8">
                            <h2 className="text-2xl font-bold mb-2">Directory Plans</h2>
                            <p className="text-muted-foreground">
                                Get discovered on Google, claim your page, capture demand, and prove performance with simple analytics.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {DIRECTORY_PLANS.map(plan => (
                                <PricingCard key={plan.id} plan={plan} />
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="platform" className="space-y-16 animate-in fade-in-50 duration-500">
                        {/* Platform Plans Grid */}
                        <div>
                            <div className="text-center max-w-2xl mx-auto mb-8">
                                <h2 className="text-2xl font-bold mb-2">Platform Plans (Core + Agent Workspace)</h2>
                                <p className="text-muted-foreground">
                                    Start with the Core (Headless Menu + Smokey). Add Craig, Pops, Ezal, and Deebo when you want automation, reporting, competitive intelligence, and compliance guardrails.
                                </p>
                            </div>

                            <div className="text-center mb-10">
                                <span className="inline-block bg-muted px-4 py-1.5 rounded-full text-sm font-medium">
                                    All agents run inside the Agent Workspace and share the same usage allowance + overages.
                                </span>
                                <div className="mt-4">
                                    <Button variant="link" asChild className="text-primary h-auto p-0">
                                        <Link href="/pricing/launch">View Launch Plans full details →</Link>
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {PLATFORM_PLANS.map(plan => (
                                    <PricingCard key={plan.id} plan={plan} />
                                ))}
                            </div>
                        </div>

                        {/* Usage Explanation */}
                        <div className="bg-muted/30 rounded-2xl p-8 border">
                            <div className="max-w-4xl mx-auto">
                                <h3 className="text-xl font-bold mb-4">How usage works</h3>
                                <p className="text-muted-foreground mb-6">
                                    Plans include monthly allowances so you can run lots of different agent tasks without guessing cost. When you exceed included usage, overages apply (transparent, metered).
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                    <div>
                                        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Universal Meters</h4>
                                        <ul className="space-y-3">
                                            {OVERAGES.slice(0, 4).map((o, i) => (
                                                <li key={i} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                                                    <span>{o.k}</span>
                                                    <span className="text-muted-foreground">{o.v}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">New Universal Meters</h4>
                                        <ul className="space-y-3">
                                            {OVERAGES.slice(4).map((o, i) => (
                                                <li key={i} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                                                    <span>{o.k}</span>
                                                    <span className="text-muted-foreground text-right pl-4">{o.v}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Add-ons Section */}
                        <div>
                            <div className="text-center max-w-3xl mx-auto mb-10">
                                <h3 className="text-2xl font-bold mb-4">Agent Workspace Add-ons</h3>
                                <p className="text-muted-foreground mb-4">
                                    Add specialized agents as your team grows. They plug into the same data and share your monthly usage allowance.
                                </p>
                                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50 text-sm">
                                    <p className="font-medium text-blue-900 dark:text-blue-200 mb-2">Agents can do many tasks — and they share the same meters</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left text-blue-800 dark:text-blue-300">
                                        <div>• Craig mostly uses <strong>Contacts Stored</strong> + <strong>Deebo Checks</strong></div>
                                        <div>• Pops mostly uses <strong>Intel Runs</strong></div>
                                        <div>• Ezal mostly uses <strong>Market Sensors</strong> + <strong>Intel Runs</strong></div>
                                        <div>• Deebo Pro increases <strong>Deebo Checks</strong> scope</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {ADDONS.map((addon) => (
                                    <Card key={addon.name} className="flex flex-col">
                                        <CardHeader>
                                            <CardTitle className="text-lg leading-tight">{addon.name}</CardTitle>
                                            <div className="mt-2">
                                                <span className="text-2xl font-bold">${addon.price}</span>
                                                <span className="text-xs text-muted-foreground">/mo</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-1">
                                            <CardDescription className="text-base mb-2 font-medium text-foreground">
                                                {addon.note}
                                            </CardDescription>
                                            <p className="text-sm text-muted-foreground">
                                                {addon.desc}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                    </TabsContent>
                </Tabs>

                <div className="mt-20 text-center">
                    <p className="text-muted-foreground">
                        Need a custom integration? <Link href="/contact" className="text-primary hover:underline">Contact our sales team</Link>.
                    </p>
                </div>
            </section>
        </>
    );
}

function PricingCard({ plan }: { plan: PricingPlan }) {
    const isHighlighted = !!plan.highlight;
    const isEnterprise = plan.id === 'enterprise';

    return (
        <Card className={`flex flex-col relative h-full transition-all duration-200 ${isHighlighted ? 'border-primary shadow-lg scale-105 z-10' : 'hover:border-primary/50'}`}>
            {isHighlighted && typeof plan.highlight === 'string' && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                        {plan.badge || plan.highlight}
                    </span>
                </div>
            )}
            <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription className="min-h-[40px]">{plan.desc}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="mb-6">
                    {plan.price !== null ? (
                        <>
                            <div className="flex items-end gap-1">
                                <span className="text-4xl font-bold">{plan.priceDisplay}</span>
                                <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>
                            </div>
                            {plan.priceLater && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    <span className="line-through mr-1">${plan.priceLater}</span>
                                    <span>Launch pricing</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <span className="text-4xl font-bold">{plan.priceDisplay}</span>
                    )}
                </div>
                <div className="space-y-4">
                    {plan.setup && <p className="text-sm font-medium text-foreground border-b pb-2">{plan.setup}</p>}
                    <ul className="space-y-3">
                        {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full" variant={isHighlighted ? "default" : "outline"}>
                    <Link href={isEnterprise ? '/contact' : `/checkout/subscription?plan=${plan.id}`}>
                        {plan.pill}
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
