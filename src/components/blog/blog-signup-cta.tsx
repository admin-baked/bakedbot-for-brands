'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BlogSignupCtaProps {
    variant: 'inline' | 'sticky';
    slug?: string;
}

export function BlogSignupCta({ variant, slug }: BlogSignupCtaProps) {
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (variant === 'sticky') {
            const stored = localStorage.getItem('blog-cta-dismissed');
            if (stored) setDismissed(true);
        }
    }, [variant]);

    const handleDismiss = () => {
        setDismissed(true);
        if (variant === 'sticky') {
            localStorage.setItem('blog-cta-dismissed', 'true');
        }
    };

    if (dismissed) return null;

    const utmParams = `utm_source=blog&utm_medium=cta${slug ? `&utm_content=${slug}` : ''}`;
    const href = `/get-started?plan=free&${utmParams}`;

    if (variant === 'sticky') {
        return (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg border-t">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-medium">
                            Start free with Scout — AI-powered cannabis marketing, no credit card required.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button asChild variant="secondary" size="sm">
                            <Link href={href}>Get Started Free</Link>
                        </Button>
                        <button
                            onClick={handleDismiss}
                            className="p-1 hover:bg-primary-foreground/10 rounded"
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Inline variant
    return (
        <section className="bg-gradient-to-r from-green-50 to-emerald-50 border-y">
            <div className="container mx-auto px-4 py-12 text-center">
                <h3 className="text-2xl font-bold mb-3">
                    Ready to grow your cannabis business?
                </h3>
                <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                    Start free with Scout — get AI-powered market analysis, SEO-first menus, and compliance checks. No credit card required.
                </p>
                <Button asChild size="lg">
                    <Link href={href}>
                        <Zap className="w-4 h-4 mr-2" />
                        Get Started Free
                    </Link>
                </Button>
            </div>
        </section>
    );
}
