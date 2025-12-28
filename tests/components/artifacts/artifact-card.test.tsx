/**
 * ArtifactCard Unit Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArtifactCard, ArtifactCardList, ArtifactInlineMarker } from '@/components/artifacts/artifact-card';
import { Artifact } from '@/types/artifact';

// Mock lucide-react
jest.mock('lucide-react', () => ({
    ExternalLink: () => <svg data-testid="icon-external-link" />,
    Sparkles: () => <svg data-testid="icon-sparkles" />,
    File: () => <svg data-testid="icon-file" />,
    Code: () => <svg data-testid="icon-code" />,
    FileText: () => <svg data-testid="icon-file-text" />,
    Search: () => <svg data-testid="icon-search" />,
    Presentation: () => <svg data-testid="icon-presentation" />,
}));

// Mock the entire lucide-react module for dynamic icon loading
jest.mock('lucide-react', () => {
    const icons: Record<string, React.FC> = {
        Code: () => <svg data-testid="icon-Code" />,
        FileText: () => <svg data-testid="icon-FileText" />,
        Search: () => <svg data-testid="icon-Search" />,
        Presentation: () => <svg data-testid="icon-Presentation" />,
        GitBranch: () => <svg data-testid="icon-GitBranch" />,
        BarChart2: () => <svg data-testid="icon-BarChart2" />,
        Table: () => <svg data-testid="icon-Table" />,
        PieChart: () => <svg data-testid="icon-PieChart" />,
        Image: () => <svg data-testid="icon-Image" />,
        File: () => <svg data-testid="icon-File" />,
        ExternalLink: () => <svg data-testid="icon-ExternalLink" />,
        Sparkles: () => <svg data-testid="icon-Sparkles" />,
    };
    return icons;
});

jest.mock('@/lib/utils', () => ({
    cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

const createMockArtifact = (overrides: Partial<Artifact> = {}): Artifact => ({
    id: 'test-artifact-1',
    type: 'code',
    title: 'Test Code Artifact',
    content: 'const x = 1;\nconst y = 2;',
    language: 'typescript',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
});

describe('ArtifactCard', () => {
    const mockOnClick = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders artifact title', () => {
        render(<ArtifactCard artifact={createMockArtifact()} onClick={mockOnClick} />);
        expect(screen.getByText('Test Code Artifact')).toBeInTheDocument();
    });

    it('renders artifact type label', () => {
        render(<ArtifactCard artifact={createMockArtifact()} onClick={mockOnClick} />);
        expect(screen.getByText('Code')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
        render(<ArtifactCard artifact={createMockArtifact()} onClick={mockOnClick} />);
        fireEvent.click(screen.getByRole('button'));
        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('shows published indicator when artifact is published', () => {
        const publishedArtifact = createMockArtifact({
            metadata: { isPublished: true, shareId: 'abc123' }
        });
        render(<ArtifactCard artifact={publishedArtifact} onClick={mockOnClick} />);
        expect(screen.getByText('Published')).toBeInTheDocument();
    });

    it('renders compact version correctly', () => {
        render(<ArtifactCard artifact={createMockArtifact()} onClick={mockOnClick} compact />);
        expect(screen.getByText('Test Code Artifact')).toBeInTheDocument();
    });

    it('renders different artifact types', () => {
        const researchArtifact = createMockArtifact({
            type: 'research',
            title: 'Market Research'
        });
        render(<ArtifactCard artifact={researchArtifact} onClick={mockOnClick} />);
        expect(screen.getByText('Research')).toBeInTheDocument();
    });
});

describe('ArtifactCardList', () => {
    const mockOnSelect = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns null for empty artifacts array', () => {
        const { container } = render(
            <ArtifactCardList artifacts={[]} onSelect={mockOnSelect} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders multiple artifact cards', () => {
        const artifacts = [
            createMockArtifact({ id: '1', title: 'First Artifact' }),
            createMockArtifact({ id: '2', title: 'Second Artifact' }),
        ];
        render(<ArtifactCardList artifacts={artifacts} onSelect={mockOnSelect} />);
        
        expect(screen.getByText('First Artifact')).toBeInTheDocument();
        expect(screen.getByText('Second Artifact')).toBeInTheDocument();
    });

    it('calls onSelect with correct artifact when clicked', () => {
        const artifacts = [
            createMockArtifact({ id: '1', title: 'First Artifact' }),
        ];
        render(<ArtifactCardList artifacts={artifacts} onSelect={mockOnSelect} />);
        
        fireEvent.click(screen.getByText('First Artifact'));
        expect(mockOnSelect).toHaveBeenCalledWith(artifacts[0]);
    });
});

describe('ArtifactInlineMarker', () => {
    const mockOnClick = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders marker with title', () => {
        render(
            <ArtifactInlineMarker 
                type="code" 
                title="View Code" 
                onClick={mockOnClick} 
            />
        );
        expect(screen.getByText('View Code')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
        render(
            <ArtifactInlineMarker 
                type="research" 
                title="View Research" 
                onClick={mockOnClick} 
            />
        );
        fireEvent.click(screen.getByText('View Research'));
        expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
});
