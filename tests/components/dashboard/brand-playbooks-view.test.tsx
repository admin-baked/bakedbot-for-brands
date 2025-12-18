import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandPlaybooksView } from '@/app/dashboard/brand/components/brand-playbooks-view';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() })
}));

jest.mock('lucide-react', () => ({
    BookOpen: () => <div data-testid="icon-book-open" />,
    History: () => <div data-testid="icon-history" />,
    Play: () => <div data-testid="icon-play" />,
    Settings2: () => <div data-testid="icon-settings-2" />,
    Plus: () => <div data-testid="icon-plus" />,
    CheckCircle2: () => <div data-testid="icon-check-circle-2" />,
    XCircle: () => <div data-testid="icon-x-circle" />,
    Clock: () => <div data-testid="icon-clock" />,
    Search: () => <div data-testid="icon-search" />,
}));

// Mock the nested list component to keep tests focused
jest.mock('./brand-playbooks-list', () => ({
    BrandPlaybooksList: () => <div data-testid="playbooks-list-mock">Mock Library</div>
}));

describe('BrandPlaybooksView Component', () => {
    it('renders the library view by default', () => {
        render(<BrandPlaybooksView />);

        expect(screen.getByText('OPERATIONAL PLAYBOOKS')).toBeInTheDocument();
        expect(screen.getByTestId('playbooks-list-mock')).toBeInTheDocument();
        expect(screen.getByText(/Batch Actions/i)).toBeInTheDocument();
    });

    it('toggles between Library and Run History', () => {
        render(<BrandPlaybooksView />);

        // Toggle to History
        const toggleButton = screen.getByRole('button', { name: /View Run History/i });
        fireEvent.click(toggleButton);

        expect(screen.getByText('Recent Activity Log')).toBeInTheDocument();
        expect(screen.queryByTestId('playbooks-list-mock')).not.toBeInTheDocument();

        // Toggle back to Library
        const backButton = screen.getByRole('button', { name: /View Library/i });
        fireEvent.click(backButton);

        expect(screen.getByTestId('playbooks-list-mock')).toBeInTheDocument();
    });

    it('renders history items in history view', () => {
        render(<BrandPlaybooksView />);

        const toggleButton = screen.getByRole('button', { name: /View Run History/i });
        fireEvent.click(toggleButton);

        expect(screen.getByText('Retail Coverage Builder')).toBeInTheDocument();
        expect(screen.getByText('12 emails sent, 2 replies')).toBeInTheDocument();
        expect(screen.getByText('API Error: Retailer #402')).toBeInTheDocument();
    });
});
