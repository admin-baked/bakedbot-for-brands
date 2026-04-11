'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LiveStats } from '@/components/landing/live-stats';
import { ArrowRight, Search } from 'lucide-react';
import { AuditPopup } from '@/components/audit/audit-popup';

export function HeroClient() {
    const [auditUrl, setAuditUrl] = useState('');
    const [popupOpen, setPopupOpen] = useState(false);
    const [popupUrl, setPopupUrl] = useState('');

    const handleAuditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!auditUrl.trim()) return;
        setPopupUrl(auditUrl.trim());
        setPopupOpen(true);
    };

    return (
        <>
            <AuditPopup
                open={popupOpen}
                onClose={() => setPopupOpen(false)}
                initialUrl={popupUrl}
            />

            <section className="relative overflow-hidden">
                <div className="absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute left-1/2 top-0 h-[540px] w-[540px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[130px]" />
                    <div className="absolute -left-24 top-36 h-[360px] w-[360px] rounded-full bg-sky-500/10 blur-[110px]" />
                    <div className="absolute -right-24 bottom-0 h-[360px] w-[360px] rounded-full bg-amber-400/10 blur-[110px]" />
                </div>

                <div className="mx-auto max-w-6xl px-4 pb-20 pt-24">
                    <div className="mx-auto max-w-4xl text-center">
                        <Badge variant="outline" className="bg-emerald-500/5 text-emerald-700 border-emerald-500/20">
                            Managed revenue activation for dispensaries
                        </Badge>

                        <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
                            Turn more first visits into{' '}
                            <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
                                repeat revenue.
                            </span>
                        </h1>

                        <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                            BakedBot helps dispensaries capture customer data, launch compliant welcome and retention
                            flows, and turn more traffic into measurable repeat business.
                        </p>

                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Button asChild size="lg" className="h-12 rounded-xl px-7 text-base font-semibold">
                                <a href="/book/martez">
                                    Book a Strategy Call
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </a>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-7 text-base font-semibold">
                                <a href="/ai-retention-audit">Run the AI Retention Audit</a>
                            </Button>
                        </div>

                        <div className="mt-10 rounded-3xl border border-white/10 bg-background/85 p-3 shadow-2xl backdrop-blur-xl">
                            <form onSubmit={handleAuditSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <div className="flex flex-1 items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Enter your dispensary website to score capture and retention readiness"
                                        className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 sm:text-base"
                                        value={auditUrl}
                                        onChange={(e) => setAuditUrl(e.target.value)}
                                    />
                                </div>
                                <Button type="submit" className="h-12 rounded-2xl px-6 text-sm font-semibold sm:text-base">
                                    Score My Site
                                </Button>
                            </form>
                            <p className="mt-3 text-xs text-muted-foreground">
                                Free check: customer capture, welcome flow readiness, conversion friction, retention depth, and compliance trust.
                            </p>
                        </div>

                        <div className="mt-10">
                            <LiveStats />
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
