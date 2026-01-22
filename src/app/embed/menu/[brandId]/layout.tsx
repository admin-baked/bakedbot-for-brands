/**
 * Embed Menu Layout
 * Minimal layout for iframe-embedded menus with no header/footer chrome.
 * Uses separate root layout to avoid global app navigation.
 */

import '@/app/globals.css';
import { Inter } from 'next/font/google';
import { Providers } from '@/app/providers';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Menu',
    description: 'Embedded menu powered by BakedBot',
    robots: 'noindex, nofollow', // Embeds should not be indexed
};

export default function EmbedMenuLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* Allow iframe embedding from any origin */}
                <meta httpEquiv="X-Frame-Options" content="ALLOWALL" />
            </head>
            <body className={`${inter.className} embed-mode`}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
