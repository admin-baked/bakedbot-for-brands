'use client';

import Link from 'next/link';
import Logo from './logo';

export function Footer() {
    const footerLinks = [
        {
            title: 'Product',
            links: ['Features', 'Integrations', 'Updates', 'Demo Menu']
        },
        {
            title: 'Company',
            links: ['About', 'Blog', 'Contact', 'Careers']
        },
        {
            title: 'Legal',
            links: ['Terms', 'Privacy', 'Compliance', 'Security']
        }
    ]
    return (
        <footer className="border-t bg-background mt-12">
            <div className="container mx-auto px-4 py-8">
                <div className="grid gap-8 md:grid-cols-[1.5fr,1fr,1fr,1fr]">
                    <div className="space-y-2">
                        <Logo />
                        <p className="text-sm text-muted-foreground">Your AI-powered guide to cannabis commerce.</p>
                    </div>
                    {footerLinks.map(section => (
                        <div key={section.title} className="space-y-2 text-sm">
                            <p className="font-semibold">{section.title}</p>
                            <ul className="space-y-1">
                                {section.links.map(link => (
                                    <li key={link}>
                                        <Link href="#" className="text-muted-foreground hover:text-primary">
                                            {link}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                 <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} BakedBot AI. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
