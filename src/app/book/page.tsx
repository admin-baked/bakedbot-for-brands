/**
 * Founder Selection Page
 * Route: /book
 * Lets visitors choose between Martez (CEO) and Jack (Head of Revenue)
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import Logo from '@/components/logo';

export const metadata: Metadata = {
    title: 'Book a Founder | BakedBot AI',
    description: 'Schedule time with a BakedBot founder. Choose between Martez (CEO) or Jack (Head of Revenue).',
};

const founders = [
    {
        slug: 'martez',
        name: 'Martez',
        title: 'Co-Founder & CEO',
        description:
            'Strategy, vision, and operator execution. Book Martez to talk about your dispensary\'s revenue system, what\'s leaking, and how BakedBot fits.',
        emoji: '🌿',
        themeColor: '#10b981',
        gradient: 'from-emerald-500/20 to-emerald-500/5',
        border: 'hover:border-emerald-500/50',
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
        slug: 'jack',
        name: 'Jack',
        title: 'Co-Founder & Head of Revenue',
        description:
            'Go-to-market, partnerships, and growth. Book Jack to explore the Operator plan, pilot terms, or channel opportunities in the cannabis market.',
        emoji: '⚡',
        themeColor: '#6366f1',
        gradient: 'from-indigo-500/20 to-indigo-500/5',
        border: 'hover:border-indigo-500/50',
        badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    },
];

export default function BookFounderPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-emerald-500/30 font-sans">
            {/* Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-15 bg-emerald-500 animate-pulse" />
                <div className="absolute top-[40%] -right-[10%] w-[30%] h-[30%] rounded-full blur-[100px] opacity-10 bg-indigo-500" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-4xl mx-auto">
                <Link href="/">
                    <Logo height={30} />
                </Link>
                <Link
                    href="/signin"
                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                    Log in
                </Link>
            </header>

            <main className="relative z-10 max-w-4xl mx-auto px-6 pt-12 pb-24">
                {/* Hero */}
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500 mb-6">
                        <Sparkles className="w-3 h-3 text-emerald-500/60" />
                        Schedule a conversation
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
                        Book a Founder
                    </h1>
                    <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
                        Choose who you&apos;d like to talk to. Both founders are hands-on with operator accounts.
                    </p>
                </div>

                {/* Founder Cards */}
                <div className="grid gap-5 sm:grid-cols-2">
                    {founders.map((founder) => (
                        <Link
                            key={founder.slug}
                            href={`/book/${founder.slug}`}
                            className={`group relative block rounded-3xl border border-white/10 bg-white/[0.02] p-8 transition-all duration-300 ${founder.border} hover:bg-white/[0.04]`}
                        >
                            {/* Glow on hover */}
                            <div
                                className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${founder.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                            />

                            <div className="relative">
                                {/* Avatar placeholder */}
                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-3xl">
                                    {founder.emoji}
                                </div>

                                {/* Name + title */}
                                <div className="mb-1">
                                    <span
                                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${founder.badge} mb-3`}
                                    >
                                        {founder.title}
                                    </span>
                                </div>
                                <h2 className="text-2xl font-extrabold tracking-tight text-white mb-3 group-hover:text-white/90">
                                    {founder.name}
                                </h2>
                                <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors mb-6">
                                    {founder.description}
                                </p>

                                {/* CTA */}
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-400 group-hover:text-white transition-colors">
                                    Book {founder.name}
                                    <ArrowRight className="h-4 w-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Reassurance */}
                <p className="mt-10 text-center text-xs text-gray-600">
                    All meetings are via BakedBot Meet (LiveKit). You&apos;ll receive a calendar invite and join link by email.
                </p>
            </main>
        </div>
    );
}
