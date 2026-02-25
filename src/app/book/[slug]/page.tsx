/**
 * Public Executive Booking Page
 * Routes: /book/martez, /book/jack
 * No authentication required.
 */

import { notFound } from 'next/navigation';
import { getExecutiveProfile } from '@/server/actions/executive-calendar';
import { BookingPageClient } from './components/booking-page-client';
import type { Metadata } from 'next';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const profile = await getExecutiveProfile(slug);
    if (!profile) return { title: 'Schedule a Meeting' };

    return {
        title: `Schedule a Meeting with ${profile.displayName} | BakedBot`,
        description: `Book time with ${profile.displayName}, ${profile.title} at BakedBot AI.`,
        openGraph: {
            title: `Meet with ${profile.displayName}`,
            description: profile.bio,
            images: profile.avatarUrl ? [profile.avatarUrl] : [],
        },
    };
}

export default async function BookingPage({ params }: Props) {
    const { slug } = await params;
    const profile = await getExecutiveProfile(slug);

    if (!profile) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <BookingPageClient profile={JSON.parse(JSON.stringify(profile))} />
        </div>
    );
}
