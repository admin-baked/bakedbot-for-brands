import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
    title: 'Vibe Studio - Design Your Dispensary Menu in 30 Seconds | BakedBot',
    description: 'Use AI to design a stunning cannabis menu. Describe your vibe and watch it come to life. Free to try, no signup required.',
    openGraph: {
        title: 'Design Your Dispensary Menu in 30 Seconds',
        description: 'AI-powered menu design for cannabis dispensaries. Try it free!',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Design Your Dispensary Menu in 30 Seconds',
        description: 'AI-powered menu design for cannabis dispensaries. Try it free!',
    },
};

export default function VibeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
            {/* Minimal Header */}
            <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-bold text-xl">BakedBot</span>
                        <span className="text-muted-foreground text-sm hidden sm:inline">Vibe Studio</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" asChild>
                            <Link href="/login">Sign In</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/signup">Start Free Trial</Link>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main>
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t mt-20 py-12 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-semibold">BakedBot</span>
                            <span className="text-muted-foreground text-sm">© 2026</span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
                            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
                            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
                            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
