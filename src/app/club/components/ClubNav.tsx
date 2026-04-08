'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, CreditCard, Gift, User } from 'lucide-react';

const TABS = [
    { href: '/club', label: 'Home', icon: Home },
    { href: '/club/pass', label: 'Pass', icon: CreditCard },
    { href: '/club/perks', label: 'Perks', icon: Gift },
    { href: '/club/profile', label: 'Profile', icon: User },
] as const;

export function ClubNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Preserve query params across navigation
    const qs = searchParams.toString();
    const suffix = qs ? `?${qs}` : '';

    return (
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#0f0f1a]/95 backdrop-blur-md border-t border-white/10"
             style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
                {TABS.map(({ href, label, icon: Icon }) => {
                    const isActive = href === '/club'
                        ? pathname === '/club'
                        : pathname.startsWith(href);

                    return (
                        <Link
                            key={href}
                            href={`${href}${suffix}`}
                            className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] transition-colors ${
                                isActive ? 'text-emerald-400' : 'text-white/50 hover:text-white/70'
                            }`}
                        >
                            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                            <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-400' : ''}`}>
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
