
import React from "react";
import Link from "next/link";
import { ArrowLeft, Check, TrendingUp, Search, MessageSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import Image from "next/image";

export const metadata = {
    title: "Ultra Cannabis Case Study | 3X Visibility in Detroit | BakedBot AI",
    description: "How Ultra Cannabis used BakedBot's headless SEO menu to triple their local search visibility and automate 85% of customer service.",
};

export default function UltraCannabisCaseStudy() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <main className="flex-1 py-12 px-4 md:py-20 md:px-6">
                <div className="container mx-auto max-w-4xl">
                    <Link href="/case-studies" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors mb-8">
                        <ArrowLeft className="h-4 w-4" /> Back to Case Studies
                    </Link>

                    <header className="mb-12">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="relative h-16 w-16 rounded-xl overflow-hidden border bg-white p-1">
                                <Image 
                                    src="/case-studies/ultra-logo.png" 
                                    alt="Ultra Cannabis Logo" 
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <Badge variant="secondary">Case Study: Retail Growth</Badge>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-balance">
                            Ultra Cannabis: How Detroit's Favorite Dispensary Tripled Organic Visibility
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed">
                            Facing a saturated market in Detroit, Ultra Cannabis needed more than just a menu—they needed a search engine powerhouse. By switching to BakedBot, they turned their catalog into an SEO asset.
                        </p>
                    </header>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                        <MetricCard icon={<TrendingUp className="text-emerald-500" />} value="300%" label="Visibility Growth" />
                        <MetricCard icon={<Search className="text-blue-500" />} value="50+" label="Monthly Org. Orders" />
                        <MetricCard icon={<MessageSquare className="text-orange-500" />} value="85%" label="Chat Automation" />
                        <MetricCard icon={<Zap className="text-yellow-500" />} value="< 1s" label="Menu Load Time" />
                    </div>

                    <div className="relative aspect-video rounded-3xl overflow-hidden mb-16 border bg-muted shadow-2xl">
                        <Image 
                            src="/case-studies/ultra-bg.png" 
                            alt="Ultra Cannabis Detroit Storefront" 
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                            <p className="text-white font-medium text-lg italic">"BakedBot didn't just give us a menu; they gave us a digital footprint."</p>
                        </div>
                    </div>

                    <div className="prose prose-lg dark:prose-invert max-w-none space-y-12">
                        <section>
                            <h2 className="text-3xl font-bold mb-4">The Challenge</h2>
                            <p>
                                Detroit is one of the most competitive cannabis markets in the country. For Ultra Cannabis, being "just another pin on the map" wasn't enough. Their legacy menu provider was slow, non-indexable by Google, and forced customers into a clunky iframe that killed conversion rates.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold mb-4">The Solution</h2>
                            <p>
                                Ultra Cannabis deployed BakedBot's **Headless Commerce Layer**. Instead of an iframe, every product became a fast, static SEO page. They paired this with **Smokey (AI Budtender)** to handle the 800+ repetitive "What's high in THC?" questions they received every month.
                            </p>
                            <div className="grid md:grid-cols-2 gap-6 mt-8">
                                <Card className="bg-muted/30 border-none">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Headless SEO Menu</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground">
                                        Eliminated iframes, allowing Google to index 1,200+ unique product-location combinations.
                                    </CardContent>
                                </Card>
                                <Card className="bg-muted/30 border-none">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Smokey AI Budtender</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground">
                                        Enabled semantic search and real-time guidance, boosting add-to-cart rates by 22%.
                                    </CardContent>
                                </Card>
                            </div>
                        </section>

                        <section className="bg-primary/5 rounded-3xl p-8 border border-primary/10">
                            <h2 className="text-3xl font-bold mb-4">The Results</h2>
                            <ul className="space-y-4">
                                <ResultItem title="Top-3 Rankings" desc="Secured 'Dispensary near me' and product-specific rankings in Detroit within 90 days." />
                                <ResultItem title="Efficiency Boost" desc="85% of support questions now handled instantly by AI, freeing up budtenders for in-store sales." />
                                <ResultItem title="Revenue Growth" desc="Attributed over $25k in monthly organic revenue directly to BakedBot-powered pages." />
                            </ul>
                        </section>
                    </div>

                    <div className="mt-20 py-12 border-t text-center">
                        <h3 className="text-2xl font-bold mb-6">Drive results like Ultra Cannabis</h3>
                        <div className="flex justify-center gap-4">
                            <Button size="lg" asChild>
                                <Link href="/get-started">Get Started</Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <Link href="/contact">Talk to an Expert</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}

function MetricCard({ icon, value, label }: { icon: React.ReactNode, value: string, label: string }) {
    return (
        <Card className="text-center border-none bg-muted/20">
            <CardContent className="pt-6">
                <div className="flex justify-center mb-2">{icon}</div>
                <div className="text-3xl font-bold mb-1">{value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
            </CardContent>
        </Card>
    );
}

function ResultItem({ title, desc }: { title: string, desc: string }) {
    return (
        <div className="flex gap-4">
            <div className="bg-primary/10 text-primary rounded-full p-1 h-fit mt-1">
                <Check className="h-4 w-4" />
            </div>
            <div>
                <h4 className="font-bold">{title}</h4>
                <p className="text-muted-foreground">{desc}</p>
            </div>
        </div>
    );
}
