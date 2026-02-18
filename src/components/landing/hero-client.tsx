'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentPlayground } from '@/components/landing/agent-playground';
import { LiveStats } from '@/components/landing/live-stats';
import { Search, ArrowRight, Store, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export function HeroClient() {
    const [userType, setUserType] = useState<'dispensary' | 'brand'>('dispensary');
    const [auditUrl, setAuditUrl] = useState('');
    const router = useRouter();

    const handleAuditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!auditUrl) return;

        // Determine destination based on user type and input
        // If it looks like a URL, go to free-audit
        // If it looks like a name, go to claim
        const isUrl = auditUrl.includes('.') || auditUrl.includes('http');

        if (isUrl) {
            router.push(`/free-audit?url=${encodeURIComponent(auditUrl)}`);
        } else {
            router.push(`/claim?q=${encodeURIComponent(auditUrl)}`);
        }
    };

    return (
        <section className="relative overflow-hidden min-h-[90vh] flex flex-col justify-center">
            {/* Background Gradients */}
            <div className="absolute inset-0 -z-10 pointer-events-none">
                <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px] opacity-60" />
                <div className="absolute top-40 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[100px] opacity-40" />
                <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[100px] opacity-40" />
            </div>

            <div className="mx-auto max-w-6xl px-4 pt-24 pb-16">
                <div className="mx-auto max-w-4xl text-center">

                    {/* User Type Toggle Pill */}
                    <div className="flex justify-center mb-8">
                        <div className="inline-flex items-center p-1 bg-muted/30 backdrop-blur-md border border-white/10 rounded-full shadow-lg">
                            <button
                                onClick={() => setUserType('dispensary')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${userType === 'dispensary'
                                    ? 'bg-emerald-600 text-white shadow-emerald-500/25 shadow-lg scale-105'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                    }`}
                            >
                                <Store className="w-4 h-4" />
                                For Dispensaries
                            </button>
                            <button
                                onClick={() => setUserType('brand')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${userType === 'brand'
                                    ? 'bg-purple-600 text-white shadow-purple-500/25 shadow-lg scale-105'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                    }`}
                            >
                                <Building2 className="w-4 h-4" />
                                For Brands
                            </button>
                        </div>
                    </div>

                    {/* Dynamic Hero Text */}
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={userType}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <Badge variant="outline" className="mb-4 bg-emerald-500/5 text-emerald-600 border-emerald-500/20 px-4 py-1.5 text-sm uppercase tracking-wider backdrop-blur-sm">
                                {userType === 'dispensary' ? 'Automate Your Retail Operations' : 'Scale Your Wholesale Distribution'}
                            </Badge>

                            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
                                {userType === 'dispensary' ? (
                                    <>
                                        Turn Your Menu Into A<br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
                                            Revenue Engine
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        Hire An AI Squad To<br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-400">
                                            Run Your Brand
                                        </span>
                                    </>
                                )}
                            </h1>

                            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                                {userType === 'dispensary'
                                    ? "Launch a headless SEO menu, automate budtender recommendations, run compliant campaigns, and spy on your competitors — all from one platform."
                                    : "Find new retail partners, generate compliant marketing campaigns, and track competitor pricing with your own team of AI agents."
                                }
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    {/* One-Click Audit Search Bar */}
                    <div className="mt-10 mb-8 max-w-xl mx-auto relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-purple-600 rounded-full blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                        <form onSubmit={handleAuditSubmit} className="relative flex items-center bg-background/90 backdrop-blur-xl rounded-full p-2 border border-white/10 shadow-2xl">
                            <Search className="ml-4 w-5 h-5 text-muted-foreground shrink-0" />
                            <input
                                type="text"
                                placeholder={userType === 'dispensary' ? "Find your store (e.g., 'Green Releaf Chicago')" : "Find your brand (e.g., 'Wyld Edibles')"}
                                className="w-full bg-transparent border-none focus:ring-0 text-base px-4 py-3 placeholder:text-muted-foreground/60"
                                value={auditUrl}
                                onChange={(e) => setAuditUrl(e.target.value)}
                            />
                            <Button size="lg" className="rounded-full px-8 shrink-0 bg-foreground text-background hover:bg-foreground/90 transition-all font-semibold">
                                {userType === 'dispensary' ? 'Claim Store' : 'Start Audit'}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </form>
                    </div>

                    {/* Agent Playground */}
                    <div className="mt-16 text-left relative z-10">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80 pointer-events-none -bottom-24 z-20"></div>
                        <AgentPlayground />

                        {/* Floating Agent Chips */}
                        <div className="hidden lg:block absolute -right-20 top-0 animate-float-slow pointer-events-none">
                            <AgentChip name="Smokey" role="Budtender" color="bg-emerald-500" />
                        </div>
                        <div className="hidden lg:block absolute -left-20 top-20 animate-float-slower pointer-events-none">
                            <AgentChip name="Craig" role="Marketer" color="bg-purple-500" />
                        </div>
                    </div>

                    <div className="mt-8 relative z-30">
                        <LiveStats />
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-40">
                <div className="w-6 h-10 border-2 border-foreground rounded-full flex justify-center p-1">
                    <div className="w-1 h-3 bg-foreground rounded-full"></div>
                </div>
            </div>
        </section>
    );
}

function AgentChip({ name, role, color }: { name: string; role: string; color: string }) {
    return (
        <div className="flex items-center gap-3 p-2 pr-4 bg-background/60 backdrop-blur-md border border-white/10 rounded-full shadow-xl">
            <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white font-bold text-xs`}>
                {name[0]}
            </div>
            <div className="text-left">
                <div className="text-xs font-bold text-foreground leading-none">{name}</div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{role}</div>
            </div>
        </div>
    );
}
