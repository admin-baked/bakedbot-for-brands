
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
    title: "New York Cannabis Compliance & Directory | BakedBot AI",
    description: "The complete guide to NY cannabis regulations, CAURD licensing, and local dispensary discovery. Stay compliant with Deebo's NY rule pack.",
};

export default function NewYorkStatePage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <main className="flex-1">
                {/* Hero section */}
                <section className="bg-gradient-to-b from-primary/5 to-background border-b py-20 px-4">
                    <div className="container mx-auto max-w-5xl text-center">
                        <Badge className="mb-4" variant="outline">State Compliance Pillar</Badge>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                            New York <span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Cannabis OS</span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 text-balance">
                            Navigating the Empire State's regulations requires more than a spreadsheet. Build a compliant, high-growth dispensary with BakedBot's NY-specific automation suite.
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button size="lg" asChild>
                                <Link href="/get-started">Launch in NY</Link>
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
                                    <div className="bg-primary/10 p-2 rounded-lg">
                                        <Gavel className="h-6 w-6 text-primary" />
                                    </div>
                                    <h2 className="text-3xl font-bold">NY Compliance Blueprint</h2>
                                </div>
                                <p className="text-lg text-muted-foreground mb-8">
                                    New York's Office of Cannabis Management (OCM) has some of the strictest marketing and operational rules in the country. Here's how BakedBot handles them:
                                </p>
                                
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <ComplianceCard 
                                        title="Marketing & Advertising"
                                        rules={[
                                            "No 'attractive to minors' imagery",
                                            "Mandatory 21+ age gates",
                                            "Clear 'For Medical Use' vs 'Adult Use' labels",
                                            "QR code transparency for COAs"
                                        ]}
                                    />
                                    <ComplianceCard 
                                        title="Operations & Retail"
                                        rules={[
                                            "BioTrack/Metrc synchronization",
                                            "Daily inventory reconciliation",
                                            "Social Equity priority tracking",
                                            "CAURD specific reporting"
                                        ]}
                                    />
                                </div>
                            </section>

                            <section className="bg-muted/30 p-8 rounded-3xl border">
                                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <Shield className="h-6 w-6 text-emerald-500" />
                                    Deebo's NY Rule Pack
                                </h3>
                                <p className="text-muted-foreground mb-6">
                                    All your campaigns, product descriptions, and site changes are automatically scanned against NYCRR Title 9, Chapter II requirements.
                                </p>
                                <ul className="grid sm:grid-cols-2 gap-4">
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-1" />
                                        <span>Automated text-only SMS for compliant alerts</span>
                                    </li>
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-1" />
                                        <span>Landing page age-verification logging</span>
                                    </li>
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-1" />
                                        <span>Prohibited term filtering for SEO copy</span>
                                    </li>
                                    <li className="flex gap-2 text-sm items-start">
                                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-1" />
                                        <span>Automated COA page generation</span>
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-3xl font-bold mb-8">Top Markets in New York</h2>
                                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    <MarketLink city="New York City" count="150+" href="/cities/new-york-city" />
                                    <MarketLink city="Buffalo" count="45+" href="/cities/buffalo" />
                                    <MarketLink city="Rochester" count="30+" href="/cities/rochester" />
                                    <MarketLink city="Albany" count="25+" href="/cities/albany" />
                                    <MarketLink city="Syracuse" count="20+" href="/cities/syracuse" />
                                    <MarketLink city="Yonkers" count="15+" href="/cities/yonkers" />
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Sidebar / FAQ */}
                        <div className="space-y-12">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl">NY Fast Facts</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FactItem label="License Types" value="Retail, Micro, Delivery" />
                                    <FactItem label="Tax Rate" value="13% (9% State + 4% Local)" />
                                    <FactItem label="Regulatory Body" value="OCM (Office of Cannabis Mgmt)" />
                                    <FactItem label="Adult Use Launch" value="Dec 2022" />
                                </CardContent>
                            </Card>

                            <div className="bg-primary p-8 rounded-3xl text-primary-foreground">
                                <h3 className="text-xl font-bold mb-2">Claim Your NY Page</h3>
                                <p className="text-primary-foreground/80 text-sm mb-6">
                                    We've already indexed 400+ NY locations. Claim your pro listing to unlock menus, SEO, and AI budtenders.
                                </p>
                                <Button variant="secondary" className="w-full" asChild>
                                    <Link href="/claim">Find My Dispensary</Link>
                                </Button>
                            </div>

                            <section>
                                <h3 className="text-xl font-bold mb-4">NY FAQ</h3>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger className="text-left text-sm">Can dispensaries advertise on social media in NY?</AccordionTrigger>
                                        <AccordionContent className="text-xs text-muted-foreground">
                                            Only with strict audience proof (90%+ over 21) and no prohibited claims or imagery.
                                        </AccordionContent>
                                    </AccordionItem>
                                    <AccordionItem value="item-2">
                                        <AccordionTrigger className="text-left text-sm">Is delivery legal in New York?</AccordionTrigger>
                                        <AccordionContent className="text-xs text-muted-foreground">
                                            Yes, delivery is a key license type in NY, especially for CAURD licensees.
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
                            <Check className="h-4 w-4 text-primary shrink-0 mt-1" />
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
        <Link href={href} className="group border rounded-2xl p-6 hover:border-primary transition-colors bg-card shadow-sm">
            <div className="font-bold flex items-center justify-between group-hover:text-primary transition-colors">
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
