
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
    title: "Illinois Cannabis Compliance & Directory | BakedBot AI",
    description: "The complete guide to Illinois cannabis regulations, IDFPR licensing, and local dispensary discovery. Scale your IL operation.",
};

export default function IllinoisStatePage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <main className="flex-1">
                {/* Hero section */}
                <section className="bg-gradient-to-b from-orange-50 to-background border-b py-20 px-4">
                    <div className="container mx-auto max-w-5xl text-center">
                        <Badge className="mb-4" variant="outline">State Compliance Pillar</Badge>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                            Illinois <span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">Cannabis OS</span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 text-balance">
                            The Land of Lincoln has some of the highest taxes and toughest operational standards. BakedBot keeps you profitable and compliant.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button size="lg" asChild>
                                <Link href="/get-started">Grow in Illinois</Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <Link href="/ai-retention-audit">Run the AI Retention Audit</Link>
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
                                    <div className="bg-orange-100 p-2 rounded-lg">
                                        <Gavel className="h-6 w-6 text-orange-600" />
                                    </div>
                                    <h2 className="text-3xl font-bold">Illinois Compliance Standards</h2>
                                </div>
                                <p className="text-lg text-muted-foreground mb-8">
                                    Managed by the IDFPR and Illinois Department of Agriculture, IL rules focus heavily on security and seed-to-sale tracking.
                                </p>
                                
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <ComplianceCard 
                                        title="IDFPR Advertising Rules"
                                        rules={[
                                            "No images of cannabis products outdoors",
                                            "No health or therapeutic claims",
                                            "Required '21+' and 'Illegal to consume in public' text",
                                            "No advertising on public transit"
                                        ]}
                                    />
                                    <ComplianceCard 
                                        title="IL Operational Guards"
                                        rules={[
                                            "Strict daily purchase limits tracking",
                                            "Out-of-state consumer limit enforcement",
                                            "Biotrack / Metrc manifest validations",
                                            "Discreet packaging requirements"
                                        ]}
                                    />
                                </div>
                            </section>

                            <section className="bg-muted/30 p-8 rounded-3xl border">
                                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <Shield className="h-6 w-6 text-orange-500" />
                                    BakedBot IL Rule Engine
                                </h3>
                                <p className="text-muted-foreground mb-6">
                                    Our Illinois engine is built for the MSO and large independent operator, focusing on precision at scale.
                                </p>
                                <ul className="grid sm:grid-cols-2 gap-4">
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-orange-500 shrink-0 mt-1" />
                                        <span>Automated consumer tax calculation (IL specific)</span>
                                    </li>
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-orange-500 shrink-0 mt-1" />
                                        <span>Medical vs Adult-Use tax separation</span>
                                    </li>
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-orange-500 shrink-0 mt-1" />
                                        <span>Dynamic purchase limit alerts for POS</span>
                                    </li>
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-orange-500 shrink-0 mt-1" />
                                        <span>Automated monthly compliance reports</span>
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-3xl font-bold mb-8">Major Illinois Markets</h2>
                                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    <MarketLink city="Chicago" count="120+" href="/cities/chicago" />
                                    <MarketLink city="Aurora" count="15+" href="/cities/aurora" />
                                    <MarketLink city="Rockford" count="12+" href="/cities/rockford" />
                                    <MarketLink city="Joliet" count="10+" href="/cities/joliet" />
                                    <MarketLink city="Naperville" count="8+" href="/cities/naperville" />
                                    <MarketLink city="Peoria" count="6+" href="/cities/peoria" />
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Sidebar / FAQ */}
                        <div className="space-y-12">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl">Illinois Fast Facts</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FactItem label="License Types" value="Retail, Craft Grow, Infuser" />
                                    <FactItem label="Tax Rate" value="Up to 40%+ (Excise based on Potency)" />
                                    <FactItem label="Regulatory Body" value="IDFPR / Dept of Ag" />
                                    <FactItem label="Adult Use Launch" value="Jan 2020" />
                                </CardContent>
                            </Card>

                            <div className="bg-orange-600 p-8 rounded-3xl text-white">
                                <h3 className="text-xl font-bold mb-2">Claim Your IL Presence</h3>
                                <p className="text-white/80 text-sm mb-6">
                                    Chicago is our home turf. Unlock your full potential in Illinois with the same tools used by the top MSOs.
                                </p>
                                <Button variant="secondary" className="w-full" asChild>
                                    <Link href="/claim">Claim My IL Shop</Link>
                                </Button>
                            </div>

                            <section>
                                <h3 className="text-xl font-bold mb-4">IL FAQ</h3>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger className="text-left text-sm">How does potency-based tax work in IL?</AccordionTrigger>
                                        <AccordionContent className="text-xs text-muted-foreground">
                                            Cannabis flower is taxed at 10%, infusions/topicals at 20%, and high-THC products ({'>'}35%) at 25% excise tax.
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger className="text-left text-sm">Can I browse IL menus online?</AccordionTrigger>
                                        <AccordionContent className="text-xs text-muted-foreground">
                                            Yes, online menus are legal and a primary conversion tool for IL dispensaries.
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
                            <Check className="h-4 w-4 text-orange-600 shrink-0 mt-1" />
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
        <Link href={href} className="group border rounded-2xl p-6 hover:border-orange-600 transition-colors bg-card shadow-sm">
            <div className="font-bold flex items-center justify-between group-hover:text-orange-600 transition-colors">
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
