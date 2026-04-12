/**
 * BookingCTA
 *
 * Inbound conversion widget used on dispensary pages and blog posts.
 * Links to the operator's Google Calendar / Calendly booking URL.
 *
 * Set NEXT_PUBLIC_BOOKING_URL in your environment variables.
 * Example: https://calendar.google.com/calendar/appointments/...
 */

import Link from 'next/link';
import { Calendar, ArrowRight, Clock } from 'lucide-react';

interface BookingCtaProps {
    variant?: 'sidebar' | 'banner' | 'inline';
    /**
     * Override copy for specific page contexts.
     * Defaults to generic dispensary-owner messaging.
     */
    headline?: string;
    subtext?: string;
}

const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL ?? '#book-a-call';

export function BookingCta({
    variant = 'sidebar',
    headline = 'Talk to a Real Human',
    subtext = 'Book a free 30-min strategy call. We\'ll show you exactly how BakedBot would work for your store.',
}: BookingCtaProps) {
    if (variant === 'banner') {
        return (
            <section className="bg-green-600 text-white py-12 px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Calendar className="w-6 h-6" />
                        <span className="text-green-200 text-sm font-semibold uppercase tracking-widest">Free Strategy Call</span>
                    </div>
                    <h2 className="text-3xl font-black mb-4">{headline}</h2>
                    <p className="text-green-100 text-lg mb-8 max-w-xl mx-auto">{subtext}</p>
                    <Link
                        href={BOOKING_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-8 py-4 rounded-xl hover:bg-green-50 transition-colors text-lg shadow-lg"
                    >
                        Schedule Your Call <ArrowRight className="w-5 h-5" />
                    </Link>
                    <p className="text-green-200 text-sm mt-4 flex items-center justify-center gap-1">
                        <Clock className="w-4 h-4" /> 30 minutes · No pitch pressure · Direct with Martez
                    </p>
                </div>
            </section>
        );
    }

    if (variant === 'inline') {
        return (
            <div className="my-10 p-6 bg-green-50 border border-green-200 rounded-2xl">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                        <Calendar className="w-6 h-6 text-green-700" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-900 mb-1">{headline}</h3>
                        <p className="text-slate-600 text-sm mb-4">{subtext}</p>
                        <Link
                            href={BOOKING_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-green-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                            Book a Free Call <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // sidebar (default)
    return (
        <div className="bg-green-600 rounded-2xl p-6 text-white shadow-xl shadow-green-100">
            <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-green-200" />
                <span className="text-green-200 text-xs font-bold uppercase tracking-widest">Free Strategy Call</span>
            </div>
            <h3 className="text-lg font-bold mb-2">{headline}</h3>
            <p className="text-green-100 text-sm mb-5 leading-relaxed">{subtext}</p>
            <Link
                href={BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-white text-green-700 font-black py-3 rounded-xl hover:bg-green-50 transition-all uppercase tracking-tight text-sm"
            >
                Schedule a Call <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-green-200 text-xs text-center mt-3 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> 30 min · No commitment
            </p>
        </div>
    );
}
