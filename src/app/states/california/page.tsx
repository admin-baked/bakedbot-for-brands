
import React from "react";
import Link from "next/link";
import { Check, Shield, AlertTriangle, Info, MapPin, ArrowRight, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Navbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";

export const metadata = {
    title: "California Cannabis Compliance & Directory | BakedBot AI",
    description: "The complete guide to California cannabis regulations, DCC licensing, and local dispensary discovery. Dominate the Golden State.",
};

export default function CaliforniaStatePage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <main className="flex-1">
                {/* Hero section */}
                <section className="bg-gradient-to-b from-yellow-50 to-background border-b py-20 px-4">
                    <div className="container mx-auto max-w-5xl text-center">
                        <Badge className="mb-4" variant="outline">State Compliance Pillar</Badge>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                            California <span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-yellow-400">Cannabis OS</span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 text-balance">
                            The largest cannabis market in the world. Scaling in California requires deep automation and perfect compliance with DCC standards.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button size="lg" asChild>
                                <Link href="/get-started">Scale in California</Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <Link href="/free-audit">Get CA Market Audit</Link>
                            </Button>
                        </div>
                    </div>
                </section>

                <div className="container mx-auto max-w-6xl px-4 py-20">
                    <div className="grid lg:grid-cols-3 gap-12">
                        {/* Left Column: Compliance & Rules */}
                        <div className="lg:col-span-2 space-y-16">
                            
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="bg-yellow-100 p-2 rounded-lg">
                                        <Gavel className="h-6 w-6 text-yellow-600" />
                                    </div>
                                    <h2 className="text-3xl font-bold">California Compliance Landscape</h2>
                                </div>
                                <p className="text-lg text-muted-foreground mb-8">
                                    The Department of Cannabis Control (DCC) manages unified rules for the entire state, but local municipal rules often add complexity.
                                </p>
                                
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <ComplianceCard 
                                        title="DCC Advertising Rules"
                                        rules={[
                                            "Audience must be {'>'}71.6% over 21",
                                            "No free products or giveaways",
                                            "Clear 'Schedule I' and 'Keep out of reach' warnings",
                                            "Mandatory license number on all ads"
                                        ]}
                                    />
                                    <ComplianceCard 
                                        title="CA Delivery Standards"
                                        rules={[
                                            "Vehicle GPS tracking requirements",
                                            "Daily manifest & sales logging",
                                            "ID verification at every handoff",
                                            "Municipal delivery opt-in overrides"
                                        ]}
                                    />
                                </div>
                            </section>

                            <section className="bg-muted/30 p-8 rounded-3xl border">
                                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <Shield className="h-6 w-6 text-yellow-500" />
                                    California-Scale Automation
                                </h3>
                                <p className="text-muted-foreground mb-6">
                                    From the Emerald Triangle to Los Angeles, BakedBot is built for the SCALE of California operations.
                                </p>
                                <ul className="grid sm:grid-cols-2 gap-4">
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-yellow-500 shrink-0 mt-1" />
                                        <span>Multi-location POS sync (Dutchie, Cova, Treez)</span>
                                    </li>
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-yellow-500 shrink-0 mt-1" />
                                        <span>Local tax rate mapping (ever-changing CA rates)</span>
                                    </li>
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-yellow-500 shrink-0 mt-1" />
                                        <span>Prop 65 warning integration for SEO</span>
                                    </li>
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-yellow-500 shrink-0 mt-1" />
                                        <span>Automated COA & batch library generation</span>
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-3xl font-bold mb-8">Major California Markets</h2>
                                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    <MarketLink city="Los Angeles" count="500+" href="/cities/los-angeles" />
                                    <MarketLink city="San Francisco" count="80+" href="/cities/san-francisco" />
                                    <MarketLink city="San Diego" count="60+" href="/cities/san-diego" />
                                    <MarketLink city="Oakland" count="50+" href="/cities/oakland" />
                                    <MarketLink city="Sacramento" count="40+" href="/cities/sacramento" />
                                    <MarketLink city="San Jose" count="35+" href="/cities/san-jose" />
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Sidebar / FAQ */}
                        <div className="space-y-12">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl">California Fast Facts</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FactItem label="License Types" value="Micro, Cultivation, Retail, Event" />
                                    <FactItem label="Tax Rate" value="15% Excise + Sales + Local" />
                                    <FactItem label="Regulatory Body" value="DCC (Dept of Cannabis Control)" />
                                    <FactItem label="Adult Use Launch" value="Jan 2018" />
                                </CardContent>
                            </Card>

                            <div className="bg-yellow-600 p-8 rounded-3xl text-white">
                                <h3 className="text-xl font-bold mb-2">Dominate CA Search</h3>
                                <p className="text-white/80 text-sm mb-6">
                                    We've indexed over 2,000 California retailers. Don't let your brand get lost in the noise.
                                </p>
                                <Button variant="secondary" className="w-full" asChild>
                                    <Link href="/claim">Claim My CA Shop</Link>
                                </Button>
                            </div>

                            <section>
                                <h3 className="text-xl font-bold mb-4">CA FAQ</h3>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger className="text-left text-sm">Do I need Prop 65 warnings on my menu?</AccordionTrigger>
                                        <AccordionContent className="text-xs text-muted-foreground">
                                            Yes, Prop 65 compliance is mandatory for all cannabis products sold in California, including digital menus.
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger className="text-left text-sm">How do the 2024 excise tax changes affect me?</AccordionTrigger>
                                        <AccordionContent className="text-xs text-muted-foreground">
                                            Excise tax is now collected directly from retailers based on gross receipts, not at the distribution level.
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </section>
                        </div>
                    </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}

function ComplianceCard({ title, rules }: { title: string, rules: string[] }) {
    return (
        <Card className="border-none bg-muted/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                    {rules.map((rule, i) => (
                        <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 text-yellow-600 shrink-0 mt-1" />
                            <span>{rule}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

function MarketLink({ city, count, href }: { city: string, count: string, href: string }) {
    return (
        <Link href={href} className="group border rounded-2xl p-6 hover:border-yellow-600 transition-colors bg-card shadow-sm">
            <div className="font-bold flex items-center justify-between group-hover:text-yellow-600 transition-colors">
                {city}
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">{count} Locations</div>
        </Link>
    );
}

function FactItem({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between items-center py-2 border-b last:border-0 border-muted">
            <span className="text-xs text-muted-foreground uppercase">{label}</span>
            <span className="text-sm font-semibold">{value}</span>
        </div>
    );
}
