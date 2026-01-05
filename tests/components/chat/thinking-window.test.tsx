/**
 * ThinkingWindow Component Tests
 * 
 * Tests for the Visual Agent Browser component logic.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThinkingWindow } from '@/components/chat/thinking-window';
import { ToolCallStep } from '@/app/dashboard/ceo/components/puff-chat';

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Utils
jest.mock('@/lib/utils', () => ({
    cn: (...inputs: any[]) => inputs.join(' '),
}));

// Fix for JSDOM missing scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('ThinkingWindow (Visual Browser)', () => {
    const mockSteps: ToolCallStep[] = [
        { id: '1', toolName: 'google_search', description: 'Searching for dispensaries', status: 'completed' },
        { id: '2', toolName: 'menu_crawler', description: 'Scanning https://dutchesscanna.com/menu for products', status: 'in-progress' },
    ];

    it('should render nothing when not active and no steps', () => {
        const { container } = render(<ThinkingWindow isThinking={false} steps={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('should display the address bar with correct URL from description', () => {
        render(<ThinkingWindow isThinking={true} steps={mockSteps} />);
        const urlElement = screen.getByTestId('browser-url');
        expect(urlElement).toHaveTextContent(/dutchesscanna\.com\/menu/);
    });

    it('should fallback to default URLs if no URL found', () => {
        const simpleSteps: ToolCallStep[] = [
             { id: '1', toolName: 'unknown_tool', description: 'Doing something', status: 'in-progress' }
        ];
        render(<ThinkingWindow isThinking={true} steps={simpleSteps} />);
        const urlElement = screen.getByTestId('browser-url');
        expect(urlElement).toHaveTextContent(/agent:\/\/puff\/unknown-tool/);
    });

    it('should show the active tool name in the tab', () => {
        render(<ThinkingWindow isThinking={true} steps={mockSteps} />);
        const tabElement = screen.getByTestId('active-tab');
        expect(tabElement).toHaveTextContent(/menu_crawler/);
    });

    it('should render correct agent config (colors)', () => {
        // Test 'Ezal' agent (Purple)
        const { rerender } = render(
            <ThinkingWindow isThinking={true} steps={mockSteps} agentName="ezal" />
        );
        expect(screen.getByText(/Market Scanner/)).toBeInTheDocument();

        // Test 'Deebo' agent (Red/Shield)
        rerender(<ThinkingWindow isThinking={true} steps={mockSteps} agentName="deebo" />);
        expect(screen.getByText(/Compliance Audit/)).toBeInTheDocument();
    });

    it('should show latency stats', () => {
        render(<ThinkingWindow isThinking={true} steps={mockSteps} />);
        expect(screen.getByText('Network Latency')).toBeInTheDocument();
        expect(screen.getByText('ms')).toBeInTheDocument();
    });

    it('should render console logs', () => {
        render(<ThinkingWindow isThinking={true} steps={mockSteps} />);
        expect(screen.getByText('Agent Console Output')).toBeInTheDocument();
        expect(screen.getByText('Scanning https://dutchesscanna.com/menu for products')).toBeInTheDocument();
    });
});
