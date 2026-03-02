import { Navbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: {
        template: '%s | BakedBot Blog',
        default: 'BakedBot Blog — Cannabis Industry Insights & Trends',
    },
    description: 'Expert insights on cannabis technology, marketing, compliance, and industry trends from the BakedBot team.',
    alternates: {
        types: {
            'application/rss+xml': '/blog/rss.xml',
        },
    },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col pt-16">
            <Navbar />
            <main className="flex-1">
                {children}
            </main>
            <LandingFooter />
        </div>
    );
}
