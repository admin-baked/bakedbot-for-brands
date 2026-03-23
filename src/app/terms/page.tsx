import React from "react";
import Link from "next/link";
import type { Metadata } from 'next';
import Logo from "@/components/logo";

export const metadata: Metadata = {
    title: 'Terms of Service | BakedBot AI',
    description: 'The legal terms and conditions for using the BakedBot AI cannabis commerce platform.',
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
                <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <Logo height={32} />
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-16">
                <h1 className="text-4xl font-bold tracking-tight mb-8">Terms of Service</h1>
                <p className="text-muted-foreground mb-12 text-sm italic">Last Updated: November 28, 2024</p>

                <div className="prose prose-sm dark:prose-invert max-w-none mt-10 space-y-8">
                    <section>
                        <h2 className="text-xl font-bold mb-3">1. Acceptance of Terms</h2>
                        <p>By accessing BakedBot, you agree to these Terms of Service and all applicable laws.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">2. Age Requirement</h2>
                        <p>You must be 21+ to use this service. Medical marijuana patients must be 18+ with valid documentation.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">3. Account Responsibilities</h2>
                        <p>You are responsible for maintaining account security and all activities under your account.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">4. Prohibited Activities</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Providing false information</li>
                            <li>Purchasing for minors</li>
                            <li>Violating state/local laws</li>
                            <li>Reselling products</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">5. Product Information</h2>
                        <p>Product availability, pricing, and descriptions are subject to change. We reserve the right to limit quantities.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">6. Payment & Orders</h2>
                        <p>All sales are final. Orders are subject to verification and compliance checks.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">7. Limitation of Liability</h2>
                        <p>BakedBot is not liable for indirect, incidental, or consequential damages arising from use of this service.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">8. Governing Law</h2>
                        <p>These terms are governed by applicable state and federal laws.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">9. Changes to Terms</h2>
                        <p>We may update these terms at any time. Continued use constitutes acceptance of changes.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">10. Contact</h2>
                        <p>For questions: <a href="mailto:support@bakedbot.ai" className="text-primary hover:underline">support@bakedbot.ai</a></p>
                    </section>
                </div>
            </main>
        </div>
    );
}
