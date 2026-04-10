import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';

export const metadata: Metadata = {
    title: 'Case Studies | BakedBot AI — Cannabis Success Stories',
    description:
        'See how dispensaries and brands use BakedBot AI to automate growth — 3x visibility, 60% open rate boost, and zero compliance flags.',
    alternates: { canonical: 'https://bakedbot.ai/case-studies' },
    openGraph: {
        title: 'Case Studies | BakedBot AI',
        description: 'Real results from real cannabis operators using BakedBot AI.',
        type: 'website',
    },
};

export default function CaseStudiesPage() {
    return (
        <div className="min-h-screen flex flex-col pt-16 bg-background text-foreground">
            <Navbar />

            <main className="flex-1 mx-auto max-w-4xl px-4 py-16">
                <div className="text-center mb-16">
                    <Badge variant="secondary">Success Stories</Badge>
                    <h1 className="mt-4 text-4xl font-bold tracking-tight">Real results from real operators.</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        See how dispensaries and brands are using BakedBot AI to automate growth.
                    </p>
                </div>

                <div className="space-y-16">
                    {/* Ultra Cannabis */}
                    <section className="grid md:grid-cols-2 gap-8 items-center">
                        <div className="relative aspect-video rounded-2xl overflow-hidden border bg-muted shadow-lg">
                            <Image
                                src="/case-studies/ultra-bg.png"
                                alt="Ultra Cannabis Detroit"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border bg-white p-0.5">
                                    <Image
                                        src="/case-studies/ultra-logo.png"
                                        alt="Ultra Logo"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                <h2 className="text-2xl font-semibold">Ultra Cannabis (Detroit)</h2>
                            </div>
                            <div className="mt-2 text-3xl font-bold text-emerald-600">3X Visibility</div>
                            <p className="mt-4 text-muted-foreground">
                                Ultra Cannabis needed to stand out in the crowded Detroit market. By switching to BakedBot&apos;s headless SEO menu, they saw a massive uptick in organic search traffic.
                            </p>
                            <ul className="mt-6 space-y-2 text-sm font-medium">
                                <li className="flex gap-2">&#10003; 50+ organic orders in first 90 days</li>
                                <li className="flex gap-2">&#10003; 85% automation of customer service chat</li>
                                <li className="flex gap-2">&#10003; Top ranking for local &ldquo;dispensary near me&rdquo; phrases</li>
                            </ul>
                            <div className="mt-8">
                                <Link href="/case-studies/ultra-cannabis" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
                                    Read Full Case Study <TrendingUp className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </section>

                    <hr className="border-border" />

                    {/* Zaza Factory */}
                    <section className="grid md:grid-cols-2 gap-8 items-center">
                        <div className="order-last md:order-first">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden border bg-white p-0.5">
                                    <Image
                                        src="/case-studies/zaza-logo.jpg"
                                        alt="Zaza Logo"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                <h2 className="text-2xl font-semibold">Zaza Factory</h2>
                            </div>
                            <div className="mt-2 text-3xl font-bold text-emerald-600">60% Open Rate Boost</div>
                            <p className="mt-4 text-muted-foreground">
                                Zaza Factory used &ldquo;Craig&rdquo; (Marketing Automation) to overhaul their customer lifecycle. Instead of generic blasts, they sent compliant, targeted SMS and emails.
                            </p>
                            <ul className="mt-6 space-y-2 text-sm font-medium">
                                <li className="flex gap-2">&#10003; 30% increase in repeat purchase rate</li>
                                <li className="flex gap-2">&#10003; 25% reduction in marketing software costs</li>
                                <li className="flex gap-2">&#10003; Zero compliance flags with Deebo checks</li>
                            </ul>
                            <div className="mt-8">
                                <Link href="/case-studies/zaza-factory" className="inline-flex items-center gap-2 text-primary font-semibold hover:underline">
                                    Read Full Case Study <TrendingUp className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                        <div className="relative aspect-video rounded-2xl overflow-hidden border bg-muted shadow-lg">
                            <Image
                                src="/case-studies/zaza-bg.png"
                                alt="Zaza Factory Dashboard"
                                fill
                                className="object-cover"
                            />
                        </div>
                    </section>
                </div>

                <div className="mt-20 text-center">
                    <h3 className="text-2xl font-semibold">Ready to be next?</h3>
                    <div className="mt-6 flex justify-center gap-4">
                        <Link href="/get-started" className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-8 text-sm font-medium text-background hover:bg-foreground/90 transition">
                            Get Started
                        </Link>
                        <Link href="/contact" className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-8 text-sm font-medium hover:bg-muted/60 transition">
                            Contact Sales
                        </Link>
                    </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
