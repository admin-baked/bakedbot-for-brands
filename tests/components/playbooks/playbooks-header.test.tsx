import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaybooksHeader, PlaybookFilterCategory } from '@/app/dashboard/playbooks/components/playbooks-header';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Search: () => <div data-testid="icon-search" />,
    Plus: () => <div data-testid="icon-plus" />,
}));

describe('PlaybooksHeader', () => {
    const defaultProps = {
        searchQuery: '',
        onSearchChange: jest.fn(),
        activeFilter: 'All' as PlaybookFilterCategory,
        onFilterChange: jest.fn(),
        onNewPlaybook: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders the title', () => {
            render(<PlaybooksHeader {...defaultProps} />);
            expect(screen.getByText('Playbooks')).toBeInTheDocument();
        });

        it('renders the subtitle', () => {
            render(<PlaybooksHeader {...defaultProps} />);
            expect(screen.getByText('Automation recipes for your brand.')).toBeInTheDocument();
        });

        it('renders search input', () => {
            render(<PlaybooksHeader {...defaultProps} />);
            expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
        });

        it('renders New Playbook button', () => {
            render(<PlaybooksHeader {...defaultProps} />);
            expect(screen.getByText('New Playbook')).toBeInTheDocument();
        });

        it('renders all filter tabs', () => {
            render(<PlaybooksHeader {...defaultProps} />);
            const filters = ['All', 'Intel', 'SEO', 'Ops', 'Finance', 'Compliance'];
            filters.forEach((filter) => {
                expect(screen.getByText(filter)).toBeInTheDocument();
            });
        });
    });

    describe('Search Functionality', () => {
        it('displays the current search query', () => {
            render(<PlaybooksHeader {...defaultProps} searchQuery="intel" />);
            const input = screen.getByPlaceholderText('Search') as HTMLInputElement;
            expect(input.value).toBe('intel');
        });

        it('calls onSearchChange when typing', () => {
            render(<PlaybooksHeader {...defaultProps} />);
            const input = screen.getByPlaceholderText('Search');
            fireEvent.change(input, { target: { value: 'test query' } });
            expect(defaultProps.onSearchChange).toHaveBeenCalledWith('test query');
        });
    });

    describe('Filter Tabs', () => {
        it('highlights the active filter', () => {
            render(<PlaybooksHeader {...defaultProps} activeFilter="Intel" />);
            const intelButton = screen.getByText('Intel');
            expect(intelButton).toHaveClass('bg-background');
        });

        it('calls onFilterChange when filter is clicked', () => {
            render(<PlaybooksHeader {...defaultProps} />);
            fireEvent.click(screen.getByText('SEO'));
            expect(defaultProps.onFilterChange).toHaveBeenCalledWith('SEO');
        });

        it('changes active filter correctly', () => {
            const { rerender } = render(<PlaybooksHeader {...defaultProps} />);

            // Initially All is active
            expect(screen.getByText('All')).toHaveClass('bg-background');

            // Click Finance
            fireEvent.click(screen.getByText('Finance'));
            expect(defaultProps.onFilterChange).toHaveBeenCalledWith('Finance');

            // Rerender with new active filter
            rerender(<PlaybooksHeader {...defaultProps} activeFilter="Finance" />);
            expect(screen.getByText('Finance')).toHaveClass('bg-background');
        });
    });

    describe('New Playbook Button', () => {
        it('calls onNewPlaybook when clicked', () => {
            render(<PlaybooksHeader {...defaultProps} />);
            fireEvent.click(screen.getByText('New Playbook'));
            expect(defaultProps.onNewPlaybook).toHaveBeenCalled();
        });
    });
});
