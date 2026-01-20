"use client";

import Link from "next/link";
import { Check, Info, Sparkles, MapPin, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DIRECTORY_PLANS, PLATFORM_PLANS, OVERAGES, ADDONS, PricingPlan } from "@/lib/config/pricing";

export function PricingUI() {
    // Combine plans for display: Scout (Directory 0) -> Pro (Directory 1) -> Growth (Platform 0) -> Empire (Platform 1)
    // This mapping ensures the hierarchy visual is correct.
    const displayPlans = [
        DIRECTORY_PLANS[0], // Scout
        DIRECTORY_PLANS[1], // Pro
        DIRECTORY_PLANS[2], // Growth
        PLATFORM_PLANS[0]   // Empire
    ];

    return (
        <>
            <section className="py-20 px-4 text-center bg-gradient-to-b from-background to-muted/20">
                <div className="container mx-auto max-w-4xl">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 font-teko uppercase">
                        No Enterprise Sales Call Required.
                    </h1>
                    <p className="text-xl text-muted-foreground mb-8 text-balance">
                        Start with a free Scout to audit your market, or deploy a full executive team to dominate it.
                        <br className="hidden md:inline" /> Simple monthly pricing. Cancel anytime.
                    </p>
                </div>
            </section>

            <section className="py-12 px-4 container mx-auto mb-20">
                
                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                    {displayPlans.map(plan => (
                        <PricingCard key={plan.id} plan={plan} />
                    ))}
                </div>

                {/* Usage & Expansion Section */}
                <div className="mt-24 space-y-16">
                    
                    {/* The Moat: ZIP Codes */}
                    <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <Badge className="mb-4 bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
                                    <MapPin className="w-3 h-3 mr-1" /> The Territorial Moat
                                </Badge>
                                <h3 className="text-3xl md:text-4xl font-bold font-teko uppercase mb-4">
                                    Claim Your ZIP Codes Before Competitors Do.
                                </h3>
                                <p className="text-slate-300 mb-6 text-lg">
                                    When you claim a ZIP code, we generate thousands of SEO-optimized "dispensary near [ZIP]" pages that funnel traffic exclusively to YOU.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <Check className="w-4 h-4 text-emerald-500" /> Pro includes 3 ZIPs
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <Check className="w-4 h-4 text-emerald-500" /> Growth includes 10 ZIPs
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <Sparkles className="w-4 h-4 text-yellow-400" /> Excess ZIPs just $15/mo
                                    </div>
                                </div>
                                <div className="mt-8">
                                    <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100" asChild>
                                        <Link href="/claim">Check ZIP Availability</Link>
                                    </Button>
                                </div>
                            </div>
                            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                                <h4 className="font-semibold text-slate-200 mb-4 uppercase tracking-wider text-sm">Territory Expansion Packs</h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                                        <span>Single ZIP</span>
                                        <span className="font-mono text-emerald-400">$15<span className="text-slate-500 text-xs">/mo</span></span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                                        <span>Metro Pack (Chicago)</span>
                                        <span className="font-mono text-emerald-400">$199<span className="text-slate-500 text-xs">/mo</span></span>
                                    </div>
                                     <div className="flex justify-between items-center border-b border-slate-700 pb-3">
                                        <span>Metro Pack (Detroit)</span>
                                        <span className="font-mono text-emerald-400">$149<span className="text-slate-500 text-xs">/mo</span></span>
                                    </div>
                                    <p className="text-xs text-slate-500 italic mt-2">
                                        *Metro packs include 50-100 strategic ZIP codes for complete city dominance.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Creative Center & Usage */}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-muted/30 rounded-2xl p-8 border">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-fuchsia-500" /> Creative Center
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                Stop paying $500/mo for a social media manager. Our AI generates on-brand content for Instagram, Email, and Web automatically. You just approve it.
                            </p>
                            <ul className="space-y-2 mb-6 text-sm">
                                <li className="flex justify-between">
                                    <span>Scout Tier</span>
                                    <span className="font-medium">0 / mo</span>
                                </li>
                                <li className="flex justify-between">
                                    <span>Pro Tier</span>
                                    <span className="font-medium">10 / mo</span>
                                </li>
                                <li className="flex justify-between">
                                    <span>Growth Tier</span>
                                    <span className="font-medium">50 / mo</span>
                                </li>
                            </ul>
                            <div className="bg-background rounded-lg p-3 border text-sm flex justify-between items-center">
                                <span>Extra Assets</span>
                                <span className="font-mono font-medium">$5.00 / piece</span>
                            </div>
                        </div>

                        <div className="bg-muted/30 rounded-2xl p-8 border">
                             <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-500" /> Usage-Based Growth
                            </h3>
                             <p className="text-muted-foreground mb-6">
                                We grow when you grow. Plans include generous allowances. Overages are transparent and metered.
                            </p>
                            <div className="space-y-3">
                                {OVERAGES.slice(0, 4).map((o, i) => (
                                    <div key={i} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                                        <span>{o.k}</span>
                                        <span className="font-mono text-muted-foreground">{o.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                <div className="mt-20 text-center">
                    <p className="text-muted-foreground mb-4">
                        Need a custom integration or white-label for your agency?
                    </p>
                     <Button variant="link" asChild className="text-primary text-lg h-auto p-0">
                        <Link href="/contact">Contact Enterprise Sales →</Link>
                    </Button>
                </div>
            </section>
        </>
    );
}

function PricingCard({ plan }: { plan: PricingPlan }) {
    const isHighlighted = !!plan.highlight;
    const isEnterprise = plan.id === 'empire';
    const isFree = plan.price === 0;

    return (
        <Card className={`flex flex-col relative h-full transition-all duration-200 ${isHighlighted ? 'border-primary shadow-xl scale-105 z-10' : 'hover:border-primary/50'}`}>
            {isHighlighted && typeof plan.highlight === 'boolean' && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                        {plan.badge || "Best Value"}
                    </span>
                </div>
            )}
            <CardHeader className={isHighlighted ? "pt-8" : ""}>
                <div className="flex justify-between items-start mb-2">
                     <CardTitle className="text-2xl font-teko uppercase tracking-wide">{plan.name}</CardTitle>
                     {!isHighlighted && plan.badge && <Badge variant="secondary" className="text-xs">{plan.badge}</Badge>}
                </div>
                <CardDescription className="min-h-[40px] text-base">{plan.desc}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="mb-8">
                     {plan.price !== null ? (
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold tracking-tight">{plan.priceDisplay}</span>
                            <span className="text-muted-foreground text-sm font-medium">{plan.period}</span>
                        </div>
                     ) : (
                        <span className="text-4xl font-bold tracking-tight">{plan.priceDisplay}</span>
                     )}
                     {plan.setup && <p className="text-xs text-muted-foreground mt-2 italic">{plan.setup}</p>}
                </div>
                
                <div className="space-y-4">
                    <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Includes:</p>
                    <ul className="space-y-3">
                        {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm">
                                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
            <CardFooter>
                <Button 
                    asChild 
                    className="w-full h-11 text-base font-semibold" 
                    variant={isHighlighted ? "default" : isFree ? "secondary" : "outline"}
                >
                    <Link href={isEnterprise ? '/contact' : `/get-started?plan=${plan.id}`}>
                        {plan.pill}
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
