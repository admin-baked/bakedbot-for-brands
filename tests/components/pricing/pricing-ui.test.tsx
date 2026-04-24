import React from 'react';
import { render, screen } from '@testing-library/react';
import { PricingUI } from '@/app/pricing/pricing-ui';
import '@testing-library/jest-dom';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Check: () => <div data-testid="check-icon" />,
    Info: () => <div data-testid="info-icon" />,
    Sparkles: () => <div data-testid="sparkles-icon" />,
    MapPin: () => <div data-testid="map-icon" />,
    Zap: () => <div data-testid="zap-icon" />,
}));

// Mock Link
jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    );
});

// Mock Tooltip components
jest.mock('@/components/ui/tooltip', () => ({
    Tooltip: ({ children }: any) => <>{children}</>,
    TooltipContent: ({ children }: any) => <div>{children}</div>,
    TooltipProvider: ({ children }: any) => <>{children}</>,
    TooltipTrigger: ({ children }: any) => <>{children}</>,
}));

// Mock Pricing Config with PUBLIC_PLANS structure
jest.mock('@/lib/config/pricing', () => ({
    PUBLIC_PLANS: [
        {
            id: 'free',
            name: 'Free Check-In',
            price: 0,
            priceDisplay: '$0',
            period: '/ mo',
            desc: 'Launch QR or tablet capture',
            features: ['Tablet or QR customer capture', 'Welcome email starter flow'],
            pill: 'Start Free',
            highlight: false,
            tier: 'directory',
            track: 'access',
            salesMotion: 'self_serve',
            ctaLabel: 'Start Free',
            ctaHref: '/onboarding?plan=free',
        },
        {
            id: 'access_intel',
            name: 'Access Intel',
            price: 149,
            priceDisplay: '$149',
            period: '/ mo',
            desc: 'Monitor competitor movement',
            features: ['Competitor tracking', 'Weekly intelligence digest'],
            pill: 'Start Access Intel',
            highlight: false,
            tier: 'directory',
            track: 'access',
            salesMotion: 'self_serve',
            ctaLabel: 'Start Access Intel',
            ctaHref: '/onboarding?plan=access_intel',
            includedCredits: 500,
        },
        {
            id: 'access_retention',
            name: 'Access Retention',
            price: 499,
            priceDisplay: '$499',
            period: '/ mo',
            desc: 'Deploy a narrow welcome and retention stack',
            features: ['Welcome Email Playbook', 'QR sign-up capture'],
            pill: 'Start Access Retention',
            highlight: true,
            tier: 'directory',
            track: 'access',
            salesMotion: 'self_serve',
            ctaLabel: 'Start Access Retention',
            ctaHref: '/onboarding?plan=access_retention',
            includedCredits: 2000,
        },
        {
            id: 'operator_core',
            name: 'Operator Core',
            price: 1499,
            priceDisplay: '$1,499',
            period: '/ mo',
            desc: 'Full managed execution',
            features: ['Managed revenue motion', 'Weekly KPI reviews'],
            pill: 'Talk to Us',
            highlight: false,
            tier: 'platform',
            track: 'operator',
            salesMotion: 'consultative',
            ctaLabel: 'Talk to Us',
            ctaHref: '/contact',
        },
    ],
    OVERAGES: [
        { k: 'AI Credits', v: '$0.005 / credit' },
        { k: 'SMS', v: '$0.035 / msg' },
    ],
    ADDONS: [],
}));

describe('PricingUI', () => {
    it('renders the header correctly', () => {
        render(<PricingUI />);
        expect(screen.getByText(/No Enterprise Sales Call Required/i)).toBeInTheDocument();
    });

    it('renders the first 4 public plans', () => {
        render(<PricingUI />);
        expect(screen.getByText('Free Check-In')).toBeInTheDocument();
        expect(screen.getByText('Access Intel')).toBeInTheDocument();
        expect(screen.getByText('Access Retention')).toBeInTheDocument();
        expect(screen.getByText('Operator Core')).toBeInTheDocument();
    });

    it('renders plan CTA buttons', () => {
        render(<PricingUI />);
        expect(screen.getByRole('link', { name: /Start Free/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Start Access Intel/i })).toBeInTheDocument();
    });

    it('renders plan prices', () => {
        render(<PricingUI />);
        expect(screen.getByText('$0')).toBeInTheDocument();
        expect(screen.getByText('$149')).toBeInTheDocument();
        expect(screen.getByText('$499')).toBeInTheDocument();
    });

    it('renders overage info', () => {
        render(<PricingUI />);
        expect(screen.getByText('AI Credits')).toBeInTheDocument();
    });
});
