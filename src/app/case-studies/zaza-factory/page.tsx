
import React from "react";
import Link from "next/link";
import { ArrowLeft, Check, Mail, Send, Target, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import Image from "next/image";

export const metadata = {
    title: "Zaza Factory Case Study | 60% Open Rate Boost | BakedBot AI",
    description: "How Zaza Factory used BakedBot's Craig (Marketing AI) to automate their customer lifecycle and drive a 30% increase in repeat purchases.",
};

export default function ZazaFactoryCaseStudy() {
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
                                    src="/case-studies/zaza-logo.jpg" 
                                    alt="Zaza Factory Logo" 
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <Badge variant="secondary">Case Study: Lifecycle Automation</Badge>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-balance">
                            Zaza Factory: Automating Retention with Craig
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl leading-relaxed">
                            Zaza Factory stopped sending generic blasts and started sending high-intent messages. Using Craig (Marketing AI), they transformed their CRM from a database into a revenue engine.
                        </p>
                    </header>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                        <MetricCard icon={<Mail className="text-emerald-500" />} value="60%" label="Open Rate Boost" />
                        <MetricCard icon={<Users className="text-blue-500" />} value="30%" label="Repeat Purchase ↑" />
                        <MetricCard icon={<BarChart3 className="text-orange-500" />} value="25%" label="Software Savings" />
                        <MetricCard icon={<Target className="text-yellow-500" />} value="100%" label="Compliance Rate" />
                    </div>

                    <div className="relative aspect-video rounded-3xl overflow-hidden mb-16 border bg-muted shadow-2xl">
                        <Image 
                            src="/case-studies/zaza-bg.png" 
                            alt="Zaza Factory Marketing Dashboard" 
                            fill
                            className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                            <p className="text-white font-medium text-lg italic">"We used to fear 'Send'. Now we just trust Craig."</p>
                        </div>
                    </div>

                    <div className="prose prose-lg dark:prose-invert max-w-none space-y-12">
                        <section>
                            <h2 className="text-3xl font-bold mb-4">The Challenge</h2>
                            <p>
                                Zaza Factory was struggling with "batch and blast" fatigue. Their open rates were plummeting, and their marketing team spent 20+ hours a week manually drafting compliant SMS and email copy. They needed a way to scale their outreach without hiring a full-scale agency.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-3xl font-bold mb-4">The Solution</h2>
                            <p>
                                They implemented **Craig**, BakedBot's Marketing AI agent. Craig didn't just automate the sending; he automated the *thinking*. By analyzing purchase history and behavioral data, Craig generated personalized, compliant sequences for every stage of the customer lifecycle.
                            </p>
                            <div className="grid md:grid-cols-2 gap-6 mt-8">
                                <Card className="bg-muted/30 border-none">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Lifecycle Playbooks</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground">
                                        Automated welcome, winback, and anniversary flows that run 24/7 without manual intervention.
                                    </CardContent>
                                </Card>
                                <Card className="bg-muted/30 border-none">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Deebo Compliance Engine</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground">
                                        Every message is pre-screened for state-specific compliance rules before it ever hits an inbox.
                                    </CardContent>
                                </Card>
                            </div>
                        </section>

                        <section className="bg-primary/5 rounded-3xl p-8 border border-primary/10">
                            <h2 className="text-3xl font-bold mb-4">The Results</h2>
                            <ul className="space-y-4">
                                <ResultItem title="Personalization at Scale" desc="Open rates jumped from 12% to over 19% on average across all automated campaigns." />
                                <ResultItem title="Repeat Revenue" desc="Customer repeat purchase rate grew by 30%, adding significant LTV to their database." />
                                <ResultItem title="Cost Reduction" desc="Replaced multiple disconnected tools with BakedBot's unified welcome and retention stack." />
                            </ul>
                        </section>
                    </div>

                    <div className="mt-20 py-12 border-t text-center">
                        <h3 className="text-2xl font-bold mb-6">Automate your growth like Zaza Factory</h3>
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
