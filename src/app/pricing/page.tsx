import { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PRICING_PLANS } from "@/lib/config/pricing";
import { Navbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";

export const metadata: Metadata = {
    title: "Pricing | BakedBot AI",
    description: "Simple, transparent pricing for cannabis brands and dispensaries.",
};

export default function PricingPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="py-20 px-4 text-center bg-gradient-to-b from-background to-muted/20">
                    <div className="container mx-auto max-w-4xl">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
                            Simple, Transparent Pricing
                        </h1>
                        <p className="text-xl text-muted-foreground mb-8 text-balance">
                            Choose the plan that fits your growth. No hidden fees, cancel anytime.
                        </p>
                    </div>
                </section>

                {/* Pricing Grid */}
                <section className="py-12 px-4 container mx-auto mb-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {PRICING_PLANS.map((plan) => (
                            <Card key={plan.id} className={`flex flex-col relative ${plan.highlight ? 'border-primary shadow-lg scale-105 z-10' : ''}`}>
                                {plan.highlight && (
                                    <div className="absolute -top-4 left-0 right-0 flex justify-center">
                                        <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                                            {plan.pill}
                                        </span>
                                    </div>
                                )}
                                <CardHeader>
                                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                    <CardDescription>{plan.desc}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="mb-6">
                                        <span className="text-4xl font-bold">{plan.priceDisplay}</span>
                                        <span className="text-muted-foreground">{plan.period}</span>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-sm font-medium text-foreground">{plan.setup}</p>
                                        <ul className="space-y-3">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <Check className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                                                    <span className="text-sm text-muted-foreground">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className="w-full" variant={plan.highlight ? "default" : "outline"}>
                                        <Link href={plan.id === 'enterprise' ? '/contact' : `/checkout/subscription?plan=${plan.id}`}>
                                            {plan.id === 'enterprise' ? 'Contact Sales' : 'Get Started'}
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    <div className="mt-16 text-center">
                        <p className="text-muted-foreground">
                            Need a custom integration? <Link href="/contact" className="text-primary hover:underline">Contact our sales team</Link>.
                        </p>
                    </div>
                </section>
            </main>

            <LandingFooter />
        </div>
    );
}
