import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeroClient } from '../hero-client';
import '@testing-library/jest-dom';

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

// Mock child components to isolate HeroClient logic
jest.mock('@/components/landing/agent-playground', () => ({
    AgentPlayground: () => <div data-testid="agent-playground">Playground</div>,
}));

jest.mock('@/components/landing/live-stats', () => ({
    LiveStats: () => <div data-testid="live-stats">Stats</div>,
}));

// Mock Framer Motion - Robust Mock
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Lucide React
jest.mock('lucide-react', () => ({
    Search: () => <div data-testid="icon-search" />,
    ArrowRight: () => <div data-testid="icon-arrow-right" />,
    Store: () => <div data-testid="icon-store" />,
    Building2: () => <div data-testid="icon-building" />,
}));



describe('HeroClient', () => {
    beforeEach(() => {
        mockPush.mockClear();
    });

    it('renders correctly with default Dispensary view', () => {
        render(<HeroClient />);
        expect(screen.getByText(/Turn Your Menu Into A/i)).toBeInTheDocument();
        expect(screen.getByText(/For Dispensaries/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Find your store/i)).toBeInTheDocument();
    });

    it('toggles to Brand view when clicked', () => {
        render(<HeroClient />);

        // Click "For Brands" toggle
        const brandToggle = screen.getByText(/For Brands/i);
        fireEvent.click(brandToggle);

        // Verify text updates
        expect(screen.getByText(/Hire An AI Squad To/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Find your brand/i)).toBeInTheDocument();
        expect(screen.getByText(/Scale Your Wholesale Distribution/i)).toBeInTheDocument();
    });

    it('navigates to claim page on search submit with name', () => {
        render(<HeroClient />);

        const input = screen.getByPlaceholderText(/Find your store/i);
        fireEvent.change(input, { target: { value: 'Green Releaf' } });

        // Find the form/button and submit
        const button = screen.getByText(/Claim Store/i);
        fireEvent.click(button);

        expect(mockPush).toHaveBeenCalledWith('/claim?q=Green%20Releaf');
    });

    it('navigates to audit page on search submit with URL', () => {
        render(<HeroClient />);

        const input = screen.getByPlaceholderText(/Find your store/i);
        fireEvent.change(input, { target: { value: 'greenreleaf.com' } });

        const button = screen.getByText(/Claim Store/i);
        fireEvent.click(button);

        expect(mockPush).toHaveBeenCalledWith('/free-audit?url=greenreleaf.com');
    });
});
