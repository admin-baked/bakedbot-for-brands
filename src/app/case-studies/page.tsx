'use client';

import React from "react";
import Link from "next/link";

import Logo from "@/components/logo";

function Badge({ children }: { children: React.ReactNode }) {
    return <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">{children}</span>;
}

export default function CaseStudiesPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
                <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                        <Logo height={32} />
                    </div>
                    <nav className="hidden md:flex text-sm font-medium gap-6">
                        <Link href="/get-started">Get Started</Link>
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-16">
                <div className="text-center mb-16">
                    <Badge>Success Stories</Badge>
                    <h1 className="mt-4 text-4xl font-bold tracking-tight">Real results from real operators.</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        See how dispensaries and brands are using BakedBot AI to automate growth.
                    </p>
                </div>

                <div className="space-y-16">
                    {/* Ultra Cannabis */}
                    <section className="grid md:grid-cols-2 gap-8 items-center">
                        <div className="bg-muted aspect-video rounded-2xl flex items-center justify-center text-muted-foreground font-medium">
                            Ultra Cannabis Imagery
                        </div>
                        <div>
                            <h2 className="text-2xl font-semibold">Ultra Cannabis (Detroit)</h2>
                            <div className="mt-2 text-3xl font-bold text-emerald-600">3X Visibility</div>
                            <p className="mt-4 text-muted-foreground">
                                Ultra Cannabis needed to stand out in the crowded Detroit market. By switching to BakedBot's headless SEO menu, they saw a massive uptick in organic search traffic.
                            </p>
                            <ul className="mt-6 space-y-2 text-sm font-medium">
                                <li className="flex gap-2">✓ 50+ organic orders in first 90 days</li>
                                <li className="flex gap-2">✓ 85% automation of customer service chat</li>
                                <li className="flex gap-2">✓ Top ranking for local "dispensary near me" phrases</li>
                            </ul>
                        </div>
                    </section>

                    <hr className="border-border" />

                    {/* Zaza Factory */}
                    <section className="grid md:grid-cols-2 gap-8 items-center md:flex-row-reverse">
                        <div className="order-last md:order-first">
                            <h2 className="text-2xl font-semibold">Zaza Factory</h2>
                            <div className="mt-2 text-3xl font-bold text-emerald-600">60% Open Rate Boost</div>
                            <p className="mt-4 text-muted-foreground">
                                Zaza Factory used "Craig" (Marketing Automation) to overhaul their customer lifecycle. Instead of generic blasts, they sent compliant, targeted SMS and emails.
                            </p>
                            <ul className="mt-6 space-y-2 text-sm font-medium">
                                <li className="flex gap-2">✓ 30% increase in repeat purchase rate</li>
                                <li className="flex gap-2">✓ 25% reduction in marketing software costs</li>
                                <li className="flex gap-2">✓ Zero compliance flags with Deebo checks</li>
                            </ul>
                        </div>
                        <div className="bg-muted aspect-video rounded-2xl flex items-center justify-center text-muted-foreground font-medium">
                            Zaza Factory Imagery
                        </div>
                    </section>
                </div>

                <div className="mt-20 text-center">
                    <h3 className="text-2xl font-semibold">Ready to be next?</h3>
                    <div className="mt-6 flex justify-center gap-4">
                        <Link href="/get-started" className="inline-flex h-10 items-center justify-center rounded-2xl bg-foreground px-8 text-sm font-medium text-background hover:bg-foreground/90 transition">
                            Get Started
                        </Link>
                        <Link href="/contact" className="inline-flex h-10 items-center justify-center rounded-2xl border border-border bg-background px-8 text-sm font-medium hover:bg-muted/60 transition">
                            Contact Sales
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
