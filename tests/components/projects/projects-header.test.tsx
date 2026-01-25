import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectsHeader } from '@/app/dashboard/projects/components/projects-header';
import { ProjectFilter } from '@/types/project';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Search: () => <div data-testid="icon-search" />,
    Plus: () => <div data-testid="icon-plus" />,
}));

describe('ProjectsHeader', () => {
    const defaultProps = {
        searchQuery: '',
        onSearchChange: jest.fn(),
        filter: 'my' as ProjectFilter,
        onFilterChange: jest.fn(),
        hasSystemProjects: true,
        onNewProject: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders the title', () => {
            render(<ProjectsHeader {...defaultProps} />);
            expect(screen.getByText('Projects')).toBeInTheDocument();
        });

        it('renders the subtitle', () => {
            render(<ProjectsHeader {...defaultProps} />);
            expect(
                screen.getByText('Organize your AI workspaces with dedicated context and instructions.')
            ).toBeInTheDocument();
        });

        it('renders search input', () => {
            render(<ProjectsHeader {...defaultProps} />);
            expect(screen.getByPlaceholderText('Search projects...')).toBeInTheDocument();
        });

        it('renders new project button', () => {
            render(<ProjectsHeader {...defaultProps} />);
            expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
        });
    });

    describe('Filter Tabs', () => {
        it('renders both filter tabs when hasSystemProjects is true', () => {
            render(<ProjectsHeader {...defaultProps} hasSystemProjects={true} />);
            expect(screen.getByText('My Projects')).toBeInTheDocument();
            expect(screen.getByText('System Projects')).toBeInTheDocument();
        });

        it('hides entire filter toggle when hasSystemProjects is false', () => {
            render(<ProjectsHeader {...defaultProps} hasSystemProjects={false} />);
            // When no system projects, entire filter toggle is hidden
            expect(screen.queryByText('My Projects')).not.toBeInTheDocument();
            expect(screen.queryByText('System Projects')).not.toBeInTheDocument();
        });

        it('highlights My Projects when filter is my', () => {
            render(<ProjectsHeader {...defaultProps} filter="my" />);
            const myProjectsBtn = screen.getByText('My Projects');
            expect(myProjectsBtn).toHaveClass('bg-background');
        });

        it('highlights System Projects when filter is system', () => {
            render(<ProjectsHeader {...defaultProps} filter="system" />);
            const systemProjectsBtn = screen.getByText('System Projects');
            expect(systemProjectsBtn).toHaveClass('bg-background');
        });

        it('calls onFilterChange when My Projects is clicked', () => {
            render(<ProjectsHeader {...defaultProps} filter="system" />);
            fireEvent.click(screen.getByText('My Projects'));
            expect(defaultProps.onFilterChange).toHaveBeenCalledWith('my');
        });

        it('calls onFilterChange when System Projects is clicked', () => {
            render(<ProjectsHeader {...defaultProps} filter="my" />);
            fireEvent.click(screen.getByText('System Projects'));
            expect(defaultProps.onFilterChange).toHaveBeenCalledWith('system');
        });
    });

    describe('Search Functionality', () => {
        it('displays current search query', () => {
            render(<ProjectsHeader {...defaultProps} searchQuery="test query" />);
            const input = screen.getByPlaceholderText('Search projects...') as HTMLInputElement;
            expect(input.value).toBe('test query');
        });

        it('calls onSearchChange when typing', () => {
            render(<ProjectsHeader {...defaultProps} />);
            const input = screen.getByPlaceholderText('Search projects...');
            fireEvent.change(input, { target: { value: 'new search' } });
            expect(defaultProps.onSearchChange).toHaveBeenCalledWith('new search');
        });
    });
});
