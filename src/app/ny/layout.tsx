import { Navbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';

export const metadata = {
    title: 'BakedBot AI | New York Cannabis Intelligence',
    description: 'AI-powered tools for New York dispensaries. Competitive intelligence, dynamic pricing, and marketing automation.',
};

export default function NYLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col pt-16">
            <Navbar />
            <main className="flex-1 bg-white">
                {children}
            </main>
            <LandingFooter />
        </div>
    );
}
