'use client';

import React from "react";
import Link from "next/link";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-50">
                <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold">B</div>
                        BakedBot AI
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-16">
                <h1 className="text-4xl font-bold tracking-tight mb-8">Privacy Policy</h1>
                Last Updated: November 28, 2024

                <div className="prose prose-sm dark:prose-invert max-w-none mt-10">
                    <h2>1. Information We Collect</h2>
                    <ul>
                        <li><strong>Personal:</strong> Name, email, phone, date of birth</li>
                        <li><strong>Transaction:</strong> Order history, payment info (tokenized)</li>
                        <li><strong>Usage:</strong> IP address, browser type, pages visited</li>
                        <li><strong>Compliance:</strong> Age verification records</li>
                    </ul>

                    <h2>2. How We Use Information</h2>
                    <ul>
                        <li>Process orders and payments</li>
                        <li>Verify age and compliance</li>
                        <li>Send order notifications</li>
                        <li>Improve our services</li>
                        <li>Comply with legal obligations</li>
                    </ul>

                    <h2>3. Information Sharing</h2>
                    <p>We share data with:</p>
                    <ul>
                        <li>Dispensaries (for order fulfillment)</li>
                        <li>Payment processors (Stripe, CannPay)</li>
                        <li>Law enforcement (when required)</li>
                    </ul>
                    <p>We do NOT sell your personal information.</p>

                    <h2>4. Data Security</h2>
                    <p>We use industry-standard encryption and security measures. However, no method is 100% secure.</p>

                    <h2>5. Your Rights</h2>
                    <ul>
                        <li>Access your data</li>
                        <li>Request corrections</li>
                        <li>Delete your account</li>
                        <li>Opt-out of marketing</li>
                    </ul>

                    <h2>6. Cookies</h2>
                    <p>We use cookies for age verification, authentication, and analytics. You can disable cookies in your browser.</p>

                    <h2>7. Data Retention</h2>
                    <p>We retain data for 7 years for compliance purposes, or as required by law.</p>

                    <h2>8. Children's Privacy</h2>
                    <p>Our service is not for anyone under 18. We do not knowingly collect data from minors.</p>

                    <h2>9. Changes to Policy</h2>
                    <p>We may update this policy. Check this page periodically for changes.</p>

                    <h2>10. Contact</h2>
                    <p>Privacy questions: <a href="mailto:privacy@bakedbot.ai">privacy@bakedbot.ai</a></p>
                </div>
            </main>
        </div>
    );
}
