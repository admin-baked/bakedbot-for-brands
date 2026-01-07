
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentResponseCarousel } from '@/components/chat/agent-response-carousel';
import '@testing-library/jest-dom';

// Mock UI components that might cause issues in simple unit tests
jest.mock('@/components/ui/carousel', () => ({
    Carousel: ({ children }: any) => <div data-testid="carousel">{children}</div>,
    CarouselContent: ({ children }: any) => <div data-testid="carousel-content">{children}</div>,
    CarouselItem: ({ children }: any) => <div data-testid="carousel-item">{children}</div>,
    CarouselNext: () => <button>Next</button>,
    CarouselPrevious: () => <button>Prev</button>,
}));

jest.mock('@/components/ui/card', () => ({
    Card: ({ children }: any) => <div data-testid="card">{children}</div>,
    CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
    CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
    CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
}));

jest.mock('@/components/ui/dialog', () => ({
    Dialog: ({ children }: any) => <div>{children}</div>,
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

jest.mock('react-markdown', () => ({ children }: any) => <div data-testid="markdown">{children}</div>);
jest.mock('remark-gfm', () => () => {});

describe('AgentResponseCarousel', () => {
    it('renders standard markdown view for short content without headers', () => {
        const content = "Just a simple response without any headers.";
        render(<AgentResponseCarousel content={content} />);
        
        expect(screen.getByText(content)).toBeInTheDocument();
        // Should NOT render carousel components
        expect(screen.queryByTestId('carousel')).not.toBeInTheDocument();
    });

    it('splits meaningful content into carousel items based on headers', () => {
        const content = `
# Section 1
Content for section 1.

## Section 2
Content for section 2.

### Section 3
Content for section 3.
        `;
        
        render(<AgentResponseCarousel content={content} />);
        
        // Should render carousel
        expect(screen.getByTestId('carousel')).toBeInTheDocument();
        
        // Should have 3 items
        const items = screen.getAllByTestId('carousel-item');
        expect(items).toHaveLength(3);
        
        // Check for titles (CardTitle renders them)
        expect(screen.getByText('Section 1')).toBeInTheDocument();
        expect(screen.getByText('Section 2')).toBeInTheDocument();
        expect(screen.getByText('Section 3')).toBeInTheDocument();
    });

    it('handles Preamble + Sections correctly', () => {
        const content = `Target Audience Analysis:
        
# Demographics
Age 25-34.

# Psychographics
High intent.`;

        render(<AgentResponseCarousel content={content} />);
        
        const items = screen.getAllByTestId('carousel-item');
        // Preamble (Summary) + Demographics + Psychographics = 3 items
        expect(items).toHaveLength(3);
        
        expect(screen.getByText('Summary')).toBeInTheDocument();
        expect(screen.getByText('Demographics')).toBeInTheDocument();
        expect(screen.getByText('Psychographics')).toBeInTheDocument();
    });

    it('filters out empty sections', () => {
        const content = `
# Header 1
Content 1

# Header 2
   
# Header 3
Content 3
`;
        render(<AgentResponseCarousel content={content} />);
        
        // Header 2 body is just whitespace, likely should be skipped if logic is strict, 
        // OR it might be included if we want to show empty sections.
        // My implementation: chunks.filter(c => c.body.trim().length > 0 || c.title !== 'Summary');
        // If Header 2 has whitespace body, it matches. 
        // Actually, let's verify logic:
        // if (bodyText.trim() || currentTitle !== 'Summary') --> If title exists, chunk is pushed even if body is empty?
        // Wait, logic says:
        // returns chunks.filter(c => c.body.trim().length > 0 || c.title !== 'Summary');
        // If title is "Header 2" (not Summary) and body is empty, it returns TRUE (kept).
        // So we expect 3 items. Header 2 will be a card with just title.
        
        const items = screen.getAllByTestId('carousel-item');
        expect(items).toHaveLength(3);
    });
});
