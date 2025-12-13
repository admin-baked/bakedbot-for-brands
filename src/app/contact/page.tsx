'use client';

import React from "react";
import Link from "next/link";

import Logo from "@/components/logo";

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
                <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold">
                        <Logo height={32} />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 py-16">
                <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Have questions about Enterprise plans, custom integrations, or partnerships? We'd love to hear from you.
                </p>

                <div className="mt-10 space-y-8">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="rounded-2xl border border-border p-6">
                            <h3 className="font-semibold">Sales</h3>
                            <p className="mt-2 text-sm text-muted-foreground">For demo requests and plan information.</p>
                            <a href="mailto:sales@bakedbot.ai" className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline">sales@bakedbot.ai</a>
                        </div>
                        <div className="rounded-2xl border border-border p-6">
                            <h3 className="font-semibold">Support</h3>
                            <p className="mt-2 text-sm text-muted-foreground">For technical help and existing customer support.</p>
                            <a href="mailto:support@bakedbot.ai" className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline">support@bakedbot.ai</a>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border p-8 bg-muted/30">
                        <h3 className="font-semibold">Headquarters</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Detroit, Michigan<br />
                            serving cannabis brands nationwide.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
