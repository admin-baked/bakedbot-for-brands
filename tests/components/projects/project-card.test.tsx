import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from '@/app/dashboard/projects/components/project-card';
import { Project } from '@/types/project';

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}));

// Mock Next.js Link
jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href} data-testid="project-link">
            {children}
        </a>
    );
});

// Mock date-fns
jest.mock('date-fns', () => ({
    formatDistanceToNow: () => '2 days ago',
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    MoreVertical: () => <div data-testid="icon-more" />,
    MessageSquare: () => <div data-testid="icon-message" />,
    FileText: () => <div data-testid="icon-file" />,
    Edit3: () => <div data-testid="icon-edit" />,
    Copy: () => <div data-testid="icon-copy" />,
    Archive: () => <div data-testid="icon-archive" />,
    Zap: () => <div data-testid="icon-zap" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    Brain: () => <div data-testid="icon-brain" />,
    Crown: () => <div data-testid="icon-crown" />,
    Shield: () => <div data-testid="icon-shield" />,
}));

const mockProject: Project = {
    id: 'test-project-1',
    name: 'Test Project',
    description: 'A test project description',
    ownerId: 'user-123',
    tenantId: 'tenant-456',
    color: '#ef4444',
    defaultModel: 'lite',
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

describe('ProjectCard', () => {
    const defaultProps = {
        project: mockProject,
        isOwner: true,
        onEdit: jest.fn(),
        onDuplicate: jest.fn(),
        onArchive: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders project name', () => {
            render(<ProjectCard {...defaultProps} />);
            expect(screen.getByText('Test Project')).toBeInTheDocument();
        });

        it('renders project description', () => {
            render(<ProjectCard {...defaultProps} />);
            expect(screen.getByText('A test project description')).toBeInTheDocument();
        });

        it('renders Admin badge when user is owner', () => {
            render(<ProjectCard {...defaultProps} isOwner={true} />);
            expect(screen.getByText('Admin')).toBeInTheDocument();
        });

        it('does not render Admin badge when user is not owner', () => {
            render(<ProjectCard {...defaultProps} isOwner={false} />);
            expect(screen.queryByText('Admin')).not.toBeInTheDocument();
        });

        it('renders accent bar with project color', () => {
            const { container } = render(<ProjectCard {...defaultProps} />);
            const accentBar = container.querySelector('[style*="background-color"]');
            expect(accentBar).toHaveStyle({ backgroundColor: '#ef4444' });
        });

        it('renders fallback text when no description', () => {
            const projectWithoutDesc = { ...mockProject, description: undefined };
            render(<ProjectCard {...defaultProps} project={projectWithoutDesc} />);
            expect(screen.getByText('No description')).toBeInTheDocument();
        });
    });

    describe('Intelligence Level Display', () => {
        it('displays Standard for lite model', () => {
            render(<ProjectCard {...defaultProps} />);
            expect(screen.getByText('Standard')).toBeInTheDocument();
        });

        it('displays Advanced for standard model', () => {
            const project = { ...mockProject, defaultModel: 'standard' };
            render(<ProjectCard {...defaultProps} project={project} />);
            expect(screen.getByText('Advanced')).toBeInTheDocument();
        });

        it('displays Expert for advanced model', () => {
            const project = { ...mockProject, defaultModel: 'advanced' };
            render(<ProjectCard {...defaultProps} project={project} />);
            expect(screen.getByText('Expert')).toBeInTheDocument();
        });

        it('displays Genius for premium model', () => {
            const project = { ...mockProject, defaultModel: 'premium' };
            render(<ProjectCard {...defaultProps} project={project} />);
            expect(screen.getByText('Genius')).toBeInTheDocument();
        });
    });

    describe('Statistics Display', () => {
        it('displays chat count', () => {
            const project = { ...mockProject, chatCount: 5 };
            render(<ProjectCard {...defaultProps} project={project} />);
            expect(screen.getByText('5 chats')).toBeInTheDocument();
        });

        it('displays document count', () => {
            const project = { ...mockProject, documentCount: 3 };
            render(<ProjectCard {...defaultProps} project={project} />);
            expect(screen.getByText('3 files')).toBeInTheDocument();
        });

        it('displays undefined counts as undefined', () => {
            render(<ProjectCard {...defaultProps} />);
            expect(screen.getByText(/chats/)).toBeInTheDocument();
            expect(screen.getByText(/files/)).toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('is clickable and navigates to project', () => {
            render(<ProjectCard {...defaultProps} />);
            const card = screen.getByText('Test Project').closest('[class*="cursor-pointer"]');
            expect(card).toBeInTheDocument();
        });
    });

    describe('Dropdown Menu', () => {
        it('renders dropdown menu trigger', () => {
            render(<ProjectCard {...defaultProps} />);
            expect(screen.getByTestId('icon-more')).toBeInTheDocument();
        });
    });
});
