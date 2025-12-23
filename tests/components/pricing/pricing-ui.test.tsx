import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PricingUI } from '@/app/pricing/pricing-ui';
import '@testing-library/jest-dom';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Check: () => <div data-testid="check-icon" />,
}));

// Mock Link
jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    );
});

// Mock Pricing Config
jest.mock('@/lib/config/pricing', () => ({
    DIRECTORY_PLANS: [
        {
            id: "free",
            name: "Free Listing",
            price: 0,
            priceDisplay: "$0",
            period: "/ mo",
            desc: "Best for: getting discovered",
            features: ["Feature 1", "Feature 2"],
            pill: "Create Free Listing",
            highlight: false,
            tier: "directory"
        },
        {
            id: "claim_pro",
            name: "Claim Pro",
            price: 99,
            priceDisplay: "$99",
            period: "/ mo",
            desc: "Best for: operators",
            features: ["Feature A", "Feature B"],
            pill: "Claim Pro",
            highlight: true,
            tier: "directory"
        }
    ],
    PLATFORM_PLANS: [
        {
            id: "starter",
            name: "Starter",
            price: 99,
            priceDisplay: "$99",
            period: "/ mo",
            desc: "Best for: single location",
            features: ["Platform Feature 1"],
            pill: "Choose Plan",
            tier: "platform"
        }
    ],
    ADDONS: [
        { name: "Addon 1", price: 149, note: "Note 1", desc: "Desc 1" }
    ],
    OVERAGES: [
        { k: "Metric 1", v: "Rate 1" }
    ]
}));

describe('PricingUI', () => {
    it('renders the header correctly', () => {
        render(<PricingUI />);
        expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument();
        expect(screen.getByText(/Start with discovery \+ claiming/)).toBeInTheDocument();
    });

    it('renders Directory Plans by default', () => {
        render(<PricingUI />);
        // Title selector
        expect(screen.getByRole('heading', { name: /Free Listing/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Claim Pro/i })).toBeInTheDocument();
        
        // Button/Link selector
        expect(screen.getByRole('link', { name: /Create Free Listing/i })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /Claim Pro/i })[0]).toBeInTheDocument();
    });

    it('switches to Platform Plans when tab is clicked', async () => {
        render(<PricingUI />);
        
        const platformTab = screen.getByRole('tab', { name: /Platform Plans/i });
        fireEvent.click(platformTab);

        // Platform tab content might be lazy-loaded or animated
        expect(await screen.findByText('Platform Plans (Core + Agent Workspace)')).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: /Starter/i })).toBeInTheDocument();
        expect(await screen.findByRole('link', { name: /Choose Plan/i })).toBeInTheDocument();
    });

    it('renders Add-ons in the platform tab', async () => {
        render(<PricingUI />);
        
        const platformTab = screen.getByRole('tab', { name: /Platform Plans/i });
        fireEvent.click(platformTab);

        expect(await screen.findByText('Agent Workspace Add-ons')).toBeInTheDocument();
        expect(await screen.findByText('Addon 1')).toBeInTheDocument();
        expect(await screen.findByText('$149')).toBeInTheDocument();
    });

    it('renders checkout links correctly', () => {
        render(<PricingUI />);
        
        const freeLink = screen.getByRole('link', { name: 'Create Free Listing' });
        expect(freeLink).toHaveAttribute('href', '/checkout/subscription?plan=free');

        const proLinks = screen.getAllByRole('link', { name: /Claim Pro/i });
        expect(proLinks[0]).toHaveAttribute('href', '/checkout/subscription?plan=claim_pro');
    });
});
