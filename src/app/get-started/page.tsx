'use client';

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// -----------------------------
// UI Components
// -----------------------------

import Logo from "@/components/logo";

function Button({ children, className = "", variant = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline", className?: string }) {
    const base = "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";
    const variants = {
        default: "bg-foreground text-background hover:opacity-90",
        outline: "border border-border bg-background hover:bg-muted/60 text-foreground",
    };
    return (
        <button className={`${base} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`rounded-2xl border border-border bg-background shadow-sm ${className}`}>{children}</div>;
}

// -----------------------------
// Page
// -----------------------------

const plans = [
    {
        id: "starter",
        name: "Starter",
        price: "$99",
        description: "Best for getting live fast",
        bullets: ["1 location/site", "2,000 pageviews/mo", "2 syncs/day"],
    },
    {
        id: "growth",
        name: "Growth",
        price: "$249",
        description: "For consistent traffic + conversion",
        popular: true,
        bullets: ["3 locations/sites", "10,000 pageviews/mo", "6 syncs/day"],
    },
    {
        id: "scale",
        name: "Scale",
        price: "$699",
        description: "For multi-location operators",
        bullets: ["10 locations/sites", "50,000 pageviews/mo", "Hourly sync"],
    },
];

export default function GetStartedPage() {
    const searchParams = useSearchParams();
    const preselected = searchParams?.get("plan");

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
                <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                        <Logo height={32} />
                    </div>
                    <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                        Already have an account? Login
                    </Link>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-4 py-10">
                <div className="text-center max-w-xl mx-auto mb-10">
                    <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Select your plan</h1>
                    <p className="mt-2 text-muted-foreground">
                        Choose the plan that fits your current scale. You can upgrade or downgrade at any time.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3 max-w-5xl mx-auto w-full">
                    {plans.map((plan) => (
                        <Card key={plan.id} className={`p-6 relative ${plan.popular ? 'border-foreground shadow-md' : ''}`}>
                            {plan.popular && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-foreground text-background text-xs font-medium rounded-full">
                                    Most Popular
                                </span>
                            )}
                            <div className="text-xl font-semibold">{plan.name}</div>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-3xl font-bold">{plan.price}</span>
                                <span className="text-sm text-muted-foreground">/mo</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2 mb-6">{plan.description}</p>

                            <ul className="space-y-2 mb-6 text-sm">
                                {plan.bullets.map((b) => (
                                    <li key={b} className="flex gap-2">
                                        <span className="text-emerald-600">✓</span> {b}
                                    </li>
                                ))}
                            </ul>

                            <Link href={`/onboarding?plan=${plan.id}`} className="w-full">
                                <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                                    Select {plan.name}
                                </Button>
                            </Link>
                        </Card>
                    ))}
                </div>

                <p className="mt-8 text-xs text-muted-foreground text-center max-w-lg">
                    By continuing, you agree to our <Link href="/terms" className="underline">Terms of Service</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
                </p>
            </main>
        </div>
    );
}
