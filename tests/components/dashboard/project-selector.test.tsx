/**
 * Unit Tests: Project Selector Component
 * 
 * Tests for the ProjectSelector dropdown component.
 * Note: Radix UI portals don't render in jest-dom, so we test core logic.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the server action
jest.mock('@/server/actions/projects', () => ({
    getProjects: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    );
});

// Import after mocks
import { ProjectSelector, ProjectBadge } from '@/components/dashboard/project-selector';
import { getProjects } from '@/server/actions/projects';
import { Project } from '@/types/project';

const mockProjects: Project[] = [
    {
        id: 'project-1',
        ownerId: 'user-1',
        name: 'Marketing Strategy',
        description: 'Marketing plans and campaigns',
        systemInstructions: 'You are a marketing expert.',
        color: '#10b981',
        icon: 'Briefcase',
        documentCount: 5,
        totalBytes: 1024,
        chatCount: 3,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-15'),
    },
    {
        id: 'project-2',
        ownerId: 'user-1',
        name: 'Product Launch',
        description: 'Q1 product launch project',
        color: '#3b82f6',
        documentCount: 10,
        totalBytes: 2048,
        chatCount: 7,
        createdAt: new Date('2025-01-05'),
        updatedAt: new Date('2025-01-20'),
    },
];

describe('ProjectSelector', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render loading state initially', () => {
        (getProjects as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
        
        render(<ProjectSelector onProjectChange={jest.fn()} />);
        
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render "No Project" when loaded with no selection', async () => {
        (getProjects as jest.Mock).mockResolvedValue(mockProjects);
        
        render(<ProjectSelector onProjectChange={jest.fn()} />);
        
        await waitFor(() => {
            expect(screen.getByText('No Project')).toBeInTheDocument();
        });
    });

    it('should render selected project name when selectedProjectId is provided', async () => {
        (getProjects as jest.Mock).mockResolvedValue(mockProjects);
        
        render(<ProjectSelector selectedProjectId="project-1" onProjectChange={jest.fn()} />);
        
        await waitFor(() => {
            expect(screen.getByText('Marketing Strategy')).toBeInTheDocument();
        });
    });

    it('should call getProjects on mount', async () => {
        (getProjects as jest.Mock).mockResolvedValue([]);
        
        render(<ProjectSelector onProjectChange={jest.fn()} />);
        
        await waitFor(() => {
            expect(getProjects).toHaveBeenCalledTimes(1);
        });
    });

    it('should handle empty projects list gracefully', async () => {
        (getProjects as jest.Mock).mockResolvedValue([]);
        
        render(<ProjectSelector onProjectChange={jest.fn()} />);
        
        await waitFor(() => {
            expect(screen.getByText('No Project')).toBeInTheDocument();
        });
    });

    it('should handle getProjects error gracefully', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (getProjects as jest.Mock).mockRejectedValue(new Error('Network error'));
        
        render(<ProjectSelector onProjectChange={jest.fn()} />);
        
        await waitFor(() => {
            expect(screen.getByText('No Project')).toBeInTheDocument();
        });
        
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});

describe('ProjectBadge', () => {
    it('should render project name', () => {
        render(<ProjectBadge project={mockProjects[0]} />);
        
        expect(screen.getByText('Marketing Strategy')).toBeInTheDocument();
    });

    it('should apply project color to border', () => {
        const { container } = render(<ProjectBadge project={mockProjects[0]} />);
        
        const badge = container.firstChild as HTMLElement;
        expect(badge.style.borderLeft).toContain('#10b981');
    });

    it('should render with different project', () => {
        render(<ProjectBadge project={mockProjects[1]} />);
        
        expect(screen.getByText('Product Launch')).toBeInTheDocument();
    });
});
