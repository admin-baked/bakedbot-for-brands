import React from 'react';
import { UnifiedLoginForm } from '@/components/auth/unified-login-form';
import { Navbar } from '@/components/landing/navbar';
import Logo from '@/components/logo';
import Link from 'next/link';

export const metadata = {
    title: 'Sign In | BakedBot AI',
    description: 'Access your AI commerce operating system.',
};

export default function SignInPage() {
    return (
        <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] opacity-40" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] opacity-40" />
            </div>

            {/* Simple Header */}
            <header className="relative z-10 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
                    <Logo height={32} />
                </Link>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Need Help?
                </Link>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <UnifiedLoginForm />

                <p className="mt-8 text-center text-xs text-muted-foreground max-w-sm">
                    By signing in, you agree to our <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
                </p>
            </main>
        </div>
    );
}
