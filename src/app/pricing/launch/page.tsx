import type { Metadata } from 'next';
import LaunchPricingDetails from './launch-pricing-client';

export const metadata: Metadata = {
    title: 'BakedBot AI Pricing | AI Budtender, Compliance, Retention & Analytics',
    description: 'Transparent pricing for the BakedBot AI commerce platform. Built for dispensaries and brands.',
};

export default function LaunchPricingPage() {
    return <LaunchPricingDetails />;
}
