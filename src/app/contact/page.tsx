import type { Metadata } from 'next';
import { Navbar } from '@/components/landing/navbar';
import { LandingFooter } from '@/components/landing/footer';

export const metadata: Metadata = {
    title: 'Contact Us | BakedBot AI',
    description:
        'Get in touch with BakedBot AI — sales, support, and partnerships for cannabis brands and dispensaries.',
    alternates: { canonical: 'https://bakedbot.ai/contact' },
};

export default function ContactPage() {
    return (
        <div className="min-h-screen flex flex-col pt-16 bg-background text-foreground">
            <Navbar />

            <main className="flex-1 mx-auto max-w-2xl px-4 py-16">
                <h1 className="text-4xl font-bold tracking-tight">Contact Us</h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Have questions about Enterprise plans, custom integrations, or partnerships? We&apos;d love to hear from you.
                </p>

                <div className="mt-10 space-y-8">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="rounded-2xl border border-border p-6">
                            <h3 className="font-semibold">Sales</h3>
                            <p className="mt-2 text-sm text-muted-foreground">For demo requests and plan information.</p>
                            <a href="mailto:sales@bakedbot.ai" className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline">sales@bakedbot.ai</a>
                        </div>
                        <div className="rounded-2xl border border-border p-6">
                            <h3 className="font-semibold">Support</h3>
                            <p className="mt-2 text-sm text-muted-foreground">For technical help and existing customer support.</p>
                            <a href="mailto:support@bakedbot.ai" className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline">support@bakedbot.ai</a>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border p-8 bg-muted/30">
                        <h3 className="font-semibold">Headquarters</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Detroit, Michigan<br />
                            Serving cannabis brands nationwide.
                        </p>
                    </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
