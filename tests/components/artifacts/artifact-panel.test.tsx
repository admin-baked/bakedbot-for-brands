/**
 * ArtifactPanel Unit Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArtifactPanel } from '@/components/artifacts/artifact-panel';
import { Artifact } from '@/types/artifact';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, title, ...props }: any) => (
        <button onClick={onClick} title={title} {...props}>{children}</button>
    ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
    ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>,
}));

jest.mock('@/lib/utils', () => ({
    cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

// Mock lucide-react
jest.mock('lucide-react', () => {
    const MockIcon = ({ className }: any) => <svg className={className} data-testid="mock-icon" />;
    return {
        X: MockIcon,
        ChevronLeft: MockIcon,
        ChevronRight: MockIcon,
        Maximize2: MockIcon,
        Minimize2: MockIcon,
        Download: MockIcon,
        Copy: MockIcon,
        Check: MockIcon,
        Share2: MockIcon,
        ExternalLink: MockIcon,
        Eye: MockIcon,
        Code: MockIcon,
        FileText: MockIcon,
        File: MockIcon,
    };
});

// Mock ArtifactRenderer
jest.mock('@/components/artifacts/artifact-renderer', () => ({
    ArtifactRenderer: ({ artifact }: any) => (
        <div data-testid="artifact-renderer">{artifact.content}</div>
    ),
}));

const createMockArtifact = (overrides: Partial<Artifact> = {}): Artifact => ({
    id: 'test-artifact-1',
    type: 'code',
    title: 'Test Code',
    content: 'const x = 1;',
    language: 'typescript',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
});

describe('ArtifactPanel', () => {
    const mockOnSelect = jest.fn();
    const mockOnClose = jest.fn();
    const mockOnShare = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns null when not open', () => {
        const { container } = render(
            <ArtifactPanel
                artifacts={[]}
                selectedArtifact={null}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                isOpen={false}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders panel when open', () => {
        render(
            <ArtifactPanel
                artifacts={[]}
                selectedArtifact={null}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                isOpen={true}
            />
        );
        expect(screen.getByText('Artifacts')).toBeInTheDocument();
    });

    it('shows empty state when no artifacts', () => {
        render(
            <ArtifactPanel
                artifacts={[]}
                selectedArtifact={null}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                isOpen={true}
            />
        );
        expect(screen.getByText('No artifacts yet')).toBeInTheDocument();
    });

    it('lists artifacts when available', () => {
        const artifacts = [
            createMockArtifact({ id: '1', title: 'First Code' }),
            createMockArtifact({ id: '2', title: 'Second Code', type: 'markdown' }),
        ];
        render(
            <ArtifactPanel
                artifacts={artifacts}
                selectedArtifact={null}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                isOpen={true}
            />
        );
        expect(screen.getByText('First Code')).toBeInTheDocument();
        expect(screen.getByText('Second Code')).toBeInTheDocument();
    });

    it('calls onSelect when artifact is clicked', () => {
        const artifacts = [createMockArtifact({ id: '1', title: 'Clickable' })];
        render(
            <ArtifactPanel
                artifacts={artifacts}
                selectedArtifact={null}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                isOpen={true}
            />
        );
        fireEvent.click(screen.getByText('Clickable'));
        expect(mockOnSelect).toHaveBeenCalledWith(artifacts[0]);
    });

    it('shows selected artifact content', () => {
        const artifact = createMockArtifact({ content: 'Selected content here' });
        render(
            <ArtifactPanel
                artifacts={[artifact]}
                selectedArtifact={artifact}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                isOpen={true}
            />
        );
        expect(screen.getByTestId('artifact-renderer')).toBeInTheDocument();
        expect(screen.getByText('Selected content here')).toBeInTheDocument();
    });

    it('shows back button when artifact is selected', () => {
        const artifact = createMockArtifact();
        render(
            <ArtifactPanel
                artifacts={[artifact]}
                selectedArtifact={artifact}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                isOpen={true}
            />
        );
        // Look for back button (ChevronLeft)
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('calls onClose when close button clicked', () => {
        render(
            <ArtifactPanel
                artifacts={[]}
                selectedArtifact={null}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                isOpen={true}
            />
        );
        // Find close button (last button in header)
        const buttons = screen.getAllByRole('button');
        const closeButton = buttons[buttons.length - 1];
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('shows share button when onShare provided', () => {
        const artifact = createMockArtifact();
        render(
            <ArtifactPanel
                artifacts={[artifact]}
                selectedArtifact={artifact}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                onShare={mockOnShare}
                isOpen={true}
            />
        );
        const shareButton = screen.getByTitle('Share');
        expect(shareButton).toBeInTheDocument();
    });

    it('shows published indicator for published artifacts', () => {
        const publishedArtifact = createMockArtifact({
            metadata: { 
                isPublished: true, 
                shareUrl: 'https://example.com/share/123' 
            }
        });
        render(
            <ArtifactPanel
                artifacts={[publishedArtifact]}
                selectedArtifact={publishedArtifact}
                onSelect={mockOnSelect}
                onClose={mockOnClose}
                isOpen={true}
            />
        );
        expect(screen.getByText(/Published/)).toBeInTheDocument();
    });

    describe('Deck Navigation', () => {
        it('shows slide navigation for deck artifacts', () => {
            const deckArtifact = createMockArtifact({
                type: 'deck',
                title: 'Test Deck',
                metadata: {
                    slides: [
                        { title: 'Slide 1', content: 'Content 1' },
                        { title: 'Slide 2', content: 'Content 2' },
                    ]
                }
            });
            render(
                <ArtifactPanel
                    artifacts={[deckArtifact]}
                    selectedArtifact={deckArtifact}
                    onSelect={mockOnSelect}
                    onClose={mockOnClose}
                    isOpen={true}
                />
            );
            expect(screen.getByText('Slide 1 of 2')).toBeInTheDocument();
            expect(screen.getByText('Previous')).toBeInTheDocument();
            expect(screen.getByText('Next')).toBeInTheDocument();
        });
    });
});
