'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ModelSelector } from '../model-selector';
import '@testing-library/jest-dom';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    ChevronDown: () => <div data-testid="icon-chevron" />,
    Lock: () => <div data-testid="icon-lock" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    Brain: () => <div data-testid="icon-brain" />,
    Zap: () => <div data-testid="icon-zap" />,
    Rocket: () => <div data-testid="icon-rocket" />,
    CheckCircle2: () => <div data-testid="icon-check" />,
    Globe: () => <div data-testid="icon-globe" />,
    Leaf: () => <div data-testid="icon-leaf" />
}));

// Mock Dropdown Menu components
jest.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="trigger">{children}</div>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="content">{children}</div>,
    DropdownMenuItem: ({ children, onClick, disabled }: any) => (
        <button onClick={!disabled ? onClick : undefined} disabled={disabled} data-testid="menu-item">
            {children}
        </button>
    ),
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
}));

describe('ModelSelector Component', () => {
    const mockOnChange = jest.fn();

    beforeEach(() => {
        mockOnChange.mockClear();
    });

    it('renders the selector with current value', () => {
        render(
            <ModelSelector 
                value="standard" 
                onChange={mockOnChange} 
            />
        );
        const trigger = screen.getByTestId('trigger');
        // Check that the trigger displays the current value
        expect(within(trigger).getByText('Standard')).toBeInTheDocument();
    });

    it('shows all options by default', async () => {
        render(
            <ModelSelector 
                value="lite" 
                onChange={mockOnChange} 
                isSuperUser={true} 
            />
        );

        const content = screen.getByTestId('content');
        
        // Use getAllByText for Lite since it's also in trigger
        expect(screen.getAllByText('Lite').length).toBeGreaterThan(0);
        
        // Others are only in content
        expect(screen.getByText('Standard')).toBeInTheDocument();
        expect(screen.getByText('Advanced')).toBeInTheDocument();
        expect(screen.getByText('Reasoning')).toBeInTheDocument();
        expect(screen.getByText('Genius')).toBeInTheDocument();
        expect(screen.getByText('Deep Research')).toBeInTheDocument();
    });

    it('hides options specified in restrictedLevels', async () => {
        render(
            <ModelSelector 
                value="lite" 
                onChange={mockOnChange} 
                restrictedLevels={['deep_research', 'genius', 'expert']}
            />
        );

        const content = screen.getByTestId('content');

        expect(screen.getByText('Standard')).toBeInTheDocument();
        expect(screen.getByText('Advanced')).toBeInTheDocument();

        // Scope to content to ensure we aren't finding trigger text accidentally
        // (Though restricted levels shouldn't be in trigger unless selected, which they aren't here)
        expect(screen.queryByText('Deep Research')).not.toBeInTheDocument();
        expect(screen.queryByText('Genius')).not.toBeInTheDocument();
        expect(screen.queryByText('Reasoning')).not.toBeInTheDocument();
    });

    it('calls onChange when an option is selected', async () => {
        render(
            <ModelSelector 
                value="lite" 
                onChange={mockOnChange} 
                userPlan="pro" 
            />
        );

        // Click Standard option
        fireEvent.click(screen.getByText('Standard'));

        expect(mockOnChange).toHaveBeenCalledWith('standard');
    });

    it('does not allow selecting locked options', async () => {
        render(
            <ModelSelector 
                value="lite" 
                onChange={mockOnChange} 
                userPlan="free" 
            />
        );

        // Try to click standard (should be disabled)
        fireEvent.click(screen.getByText('Standard'));
        
        expect(mockOnChange).not.toHaveBeenCalled();
    });
});
