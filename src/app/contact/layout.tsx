import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contact Us | BakedBot AI',
    description:
        'Reach out to BakedBot AI — demos, Founding Partner program, and CAURD tech grant guidance for New York dispensaries.',
    alternates: { canonical: 'https://bakedbot.ai/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return children;
}
