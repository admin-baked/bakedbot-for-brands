'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import Script from 'next/script';

/**
 * Thank You page for Google Ads conversion tracking
 * URL: /thank-you
 * 
 * Query params:
 * - plan: The plan they subscribed to (claim_pro | founders_claim)
 * - name: Business name (optional)
 */
export default function ThankYouPage() {
    const searchParams = useSearchParams();
    const planId = searchParams?.get('plan') || 'claim_pro';
    const businessName = searchParams?.get('name') || 'Your Business';

    // Fire Google Ads conversion on mount
    useEffect(() => {
        // gtag conversion tracking (if gtag is loaded)
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'conversion', {
                send_to: 'AW-CONVERSION_ID/CONVERSION_LABEL', // Replace with actual values
                value: planId === 'founders_claim' ? 79 : 99,
                currency: 'USD',
                transaction_id: `tx_${Date.now()}`
            });
        }
    }, [planId]);

    const isFounders = planId === 'founders_claim';

    return (
        <>
            {/* Google Ads Global Site Tag - Replace AW-CONVERSION_ID with your actual ID */}
            <Script
                src="https://www.googletagmanager.com/gtag/js?id=AW-CONVERSION_ID"
                strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
                {`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', 'AW-CONVERSION_ID');
                `}
            </Script>

            <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background flex items-center justify-center p-4">
                <Card className="w-full max-w-lg animate-in fade-in zoom-in duration-500 shadow-xl border-green-200 dark:border-green-800">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-3xl font-bold">
                            Welcome to BakedBot! 🎉
                        </CardTitle>
                        <CardDescription className="text-lg mt-2">
                            Your subscription is now active.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {/* Order confirmation */}
                        <div className="rounded-lg bg-muted/50 p-4 text-center">
                            <p className="font-semibold text-lg">{businessName}</p>
                            <p className="text-muted-foreground">
                                {isFounders ? (
                                    <span className="text-orange-600 dark:text-orange-400 font-medium">
                                        <Sparkles className="inline h-4 w-4 mr-1" />
                                        Founders Claim – $79/mo locked in forever!
                                    </span>
                                ) : (
                                    <span>Claim Pro – $99/mo</span>
                                )}
                            </p>
                        </div>

                        {/* What happens next */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-center">What happens next?</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 font-bold">1.</span>
                                    Our team will verify your ownership within 24-48 hours.
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 font-bold">2.</span>
                                    You'll receive an email with login credentials for your dashboard.
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-600 font-bold">3.</span>
                                    Once verified, your page goes live with full AI-powered features.
                                </li>
                            </ul>
                        </div>

                        {/* CTAs */}
                        <div className="flex flex-col gap-3 pt-4">
                            <Button asChild size="lg" className="w-full">
                                <Link href="/brand-login">
                                    Sign In to Dashboard
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="w-full">
                                <Link href="/">
                                    Return to Homepage
                                </Link>
                            </Button>
                        </div>

                        {/* Support */}
                        <p className="text-xs text-center text-muted-foreground pt-2">
                            Questions? Email us at{' '}
                            <a href="mailto:support@bakedbot.ai" className="underline hover:text-foreground">
                                support@bakedbot.ai
                            </a>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
