import React from 'react';
import { render, screen } from '@testing-library/react';
import { HelpButton } from '@/app/dashboard/projects/components/help-button';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    HelpCircle: () => <div data-testid="icon-help" />,
}));

// Mock Tooltip components
jest.mock('@/components/ui/tooltip', () => ({
    Tooltip: ({ children }: any) => <div>{children}</div>,
    TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
    TooltipProvider: ({ children }: any) => <div>{children}</div>,
    TooltipTrigger: ({ children }: any) => <div data-testid="tooltip-trigger">{children}</div>,
}));

describe('HelpButton', () => {
    it('renders the help icon', () => {
        render(<HelpButton />);
        expect(screen.getByTestId('icon-help')).toBeInTheDocument();
    });

    it('renders button with fixed position classes', () => {
        const { container } = render(<HelpButton />);
        const button = container.querySelector('button');
        expect(button?.className).toContain('fixed');
        expect(button?.className).toContain('bottom-6');
        expect(button?.className).toContain('right-6');
    });

    it('has glass styling', () => {
        const { container } = render(<HelpButton />);
        const button = container.querySelector('button');
        expect(button?.className).toContain('glass-card');
    });

    it('renders tooltip with help text', () => {
        render(<HelpButton />);
        expect(screen.getByText('Need help with Projects?')).toBeInTheDocument();
    });
});
