
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
    title: "Michigan Cannabis Compliance & Directory | BakedBot AI",
    description: "The complete guide to Michigan cannabis regulations, CRA licensing, and local dispensary discovery. Grow your MI brand with BakedBot.",
};

export default function MichiganStatePage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <main className="flex-1">
                {/* Hero section */}
                <section className="bg-gradient-to-b from-blue-50 to-background border-b py-20 px-4">
                    <div className="container mx-auto max-w-5xl text-center">
                        <Badge className="mb-4" variant="outline">State Compliance Pillar</Badge>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                            Michigan <span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">Cannabis OS</span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 text-balance">
                            Michigan is one of the most mature and high-volume markets in the US. Don't let compliance errors slow your expansion.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button size="lg" asChild>
                                <Link href="/get-started">Scale in Michigan</Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <Link href="/free-audit">Get MI Market Scan</Link>
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
                                    <div className="bg-blue-100 p-2 rounded-lg">
                                        <Gavel className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <h2 className="text-3xl font-bold">MI Compliance Snapshot</h2>
                                </div>
                                <p className="text-lg text-muted-foreground mb-8">
                                    The Cannabis Regulatory Agency (CRA) moves fast. BakedBot stays current with all Michigan Rule Sets (1-10).
                                </p>
                                
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <ComplianceCard 
                                        title="CRA Packaging Rules"
                                        rules={[
                                            "Clear 'Contains Cannabis' warnings",
                                            "Child-resistant exits on all retail sales",
                                            "Precise THC/CBD content by weight",
                                            "Batch/Harvest tracking per package"
                                        ]}
                                    />
                                    <ComplianceCard 
                                        title="Michigan SEO Guardrails"
                                        rules={[
                                            "No curative or medical claims in blog content",
                                            "Local municipality rule variations",
                                            "Inventory-first menu discovery",
                                            "Real-time Metrc manifest sync"
                                        ]}
                                    />
                                </div>
                            </section>

                            <section className="bg-muted/30 p-8 rounded-3xl border">
                                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <Shield className="h-6 w-6 text-blue-500" />
                                    CRA Dynamic Rule Pack
                                </h3>
                                <p className="text-muted-foreground mb-6">
                                    BakedBot's enforcer (Deebo) is pre-configured for Michigan's unique social equity and local municipal opt-in/opt-out monitoring.
                                </p>
                                <ul className="grid sm:grid-cols-2 gap-4">
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-blue-500 shrink-0 mt-1" />
                                        <span>Metrc integration for accurate menu sync</span>
                                    </li>
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-blue-500 shrink-0 mt-1" />
                                        <span>Local ordinance mapping per location</span>
                                    </li>
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-blue-500 shrink-0 mt-1" />
                                        <span>Automated customer reciprocity tracking</span>
                                    </li>
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-blue-500 shrink-0 mt-1" />
                                        <span>Daily CRA newsfeed updates for staff</span>
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-3xl font-bold mb-8">Major Michigan Markets</h2>
                                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    <MarketLink city="Detroit" count="100+" href="/cities/detroit" />
                                    <MarketLink city="Grand Rapids" count="40+" href="/cities/grand-rapids" />
                                    <MarketLink city="Ann Arbor" count="35+" href="/cities/ann-arbor" />
                                    <MarketLink city="Lansing" count="25+" href="/cities/lansing" />
                                    <MarketLink city="Kalamazoo" count="20+" href="/cities/kalamazoo" />
                                    <MarketLink city="Traverse City" count="15+" href="/cities/traverse-city" />
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Sidebar / FAQ */}
                        <div className="space-y-12">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl">Michigan Fast Facts</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FactItem label="License Types" value="Retail, Consumption Lounge, Events" />
                                    <FactItem label="Tax Rate" value="16% (6% Sales + 10% Excise)" />
                                    <FactItem label="Regulatory Body" value="CRA (Cannabis Regulatory Agency)" />
                                    <FactItem label="Reciprocity" value="Yes - Medical recognized" />
                                </CardContent>
                            </Card>

                            <div className="bg-blue-600 p-8 rounded-3xl text-white">
                                <h3 className="text-xl font-bold mb-2">Claim Your MI Brand</h3>
                                <p className="text-white/80 text-sm mb-6">
                                    We track over 600 dispensaries in Michigan. Claim your spot and start converting more Detroit traffic today.
                                </p>
                                <Button variant="secondary" className="w-full" asChild>
                                    <Link href="/claim">Claim My MI Shop</Link>
                                </Button>
                            </div>

                            <section>
                                <h3 className="text-xl font-bold mb-4">MI FAQ</h3>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger className="text-left text-sm">How do I handle Metrc issues in MI?</AccordionTrigger>
                                        <AccordionContent className="text-xs text-muted-foreground">
                                            BakedBot's sync runs every 5-15 minutes to ensure your public menu perfectly matches your Metrc inventory.
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger className="text-left text-sm">Are consumption lounges legal in Michigan?</AccordionTrigger>
                                        <AccordionContent className="text-xs text-muted-foreground">
                                            Yes, Michigan has one of the most progressive consumption lounge frameworks in the US.
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
                            <Check className="h-4 w-4 text-blue-600 shrink-0 mt-1" />
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
        <Link href={href} className="group border rounded-2xl p-6 hover:border-blue-600 transition-colors bg-card shadow-sm">
            <div className="font-bold flex items-center justify-between group-hover:text-blue-600 transition-colors">
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
