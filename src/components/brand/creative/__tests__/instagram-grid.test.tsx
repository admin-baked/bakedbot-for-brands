import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstagramGrid, InstagramPost } from '../instagram-grid';
import '@testing-library/jest-dom';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Heart: ({ className }: { className?: string }) => <span data-testid="heart-icon" className={className}>♥</span>,
    MessageCircle: ({ className }: { className?: string }) => <span data-testid="message-icon" className={className}>💬</span>,
    ImageOff: ({ className }: { className?: string }) => <span data-testid="image-off-icon" className={className}>🖼</span>,
}));

// Mock DeeboBadge component
jest.mock('../deebo-badge', () => ({
    DeeboBadge: jest.fn(({ status }) => (
        <div data-testid="deebo-badge">{status}</div>
    ))
}));

describe('InstagramGrid', () => {
    const mockOnSelect = jest.fn();

    const mockPosts: InstagramPost[] = [
        { id: '1', imageUrl: 'https://example.com/image1.jpg', likes: 100, comments: 10 },
        { id: '2', imageUrl: 'https://example.com/image2.jpg', likes: 200, comments: 20, isDraft: true, complianceStatus: 'active' },
        { id: '3', imageUrl: 'https://example.com/image3.jpg', likes: 300, comments: 30 },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Grid rendering', () => {
        it('renders all posts in the grid', () => {
            render(<InstagramGrid posts={mockPosts} onSelect={mockOnSelect} />);

            // Images have alt="" so they have role="presentation", use querySelectorAll instead
            const images = document.querySelectorAll('img[src^="https://example.com"]');
            expect(images).toHaveLength(3);
        });

        it('renders the Instagram header mock', () => {
            render(<InstagramGrid posts={mockPosts} onSelect={mockOnSelect} />);

            expect(screen.getByText('Your Brand')).toBeInTheDocument();
            expect(screen.getByText('Cannabis • Lifestyle')).toBeInTheDocument();
        });

        it('calls onSelect when post is clicked', () => {
            render(<InstagramGrid posts={mockPosts} onSelect={mockOnSelect} />);

            const postContainers = document.querySelectorAll('.group');
            fireEvent.click(postContainers[0]);

            expect(mockOnSelect).toHaveBeenCalledWith(mockPosts[0]);
        });
    });

    describe('Draft/Ghost posts', () => {
        it('shows Ghost indicator for draft posts', () => {
            render(<InstagramGrid posts={mockPosts} onSelect={mockOnSelect} />);

            expect(screen.getByText('Ghost')).toBeInTheDocument();
        });

        it('shows DeeboBadge for draft posts with compliance status', () => {
            render(<InstagramGrid posts={mockPosts} onSelect={mockOnSelect} />);

            expect(screen.getByTestId('deebo-badge')).toBeInTheDocument();
            expect(screen.getByTestId('deebo-badge')).toHaveTextContent('active');
        });

        it('does not show Ghost indicator for non-draft posts', () => {
            const nonDraftPosts: InstagramPost[] = [
                { id: '1', imageUrl: 'https://example.com/image1.jpg', likes: 100, comments: 10 },
            ];

            render(<InstagramGrid posts={nonDraftPosts} onSelect={mockOnSelect} />);

            expect(screen.queryByText('Ghost')).not.toBeInTheDocument();
        });
    });

    describe('ImageWithFallback component', () => {
        it('renders images with correct src', () => {
            render(<InstagramGrid posts={mockPosts} onSelect={mockOnSelect} />);

            // Images have alt="" so they have role="presentation", use querySelector instead
            const images = document.querySelectorAll('img[src^="https://example.com"]');
            expect(images[0]).toHaveAttribute('src', 'https://example.com/image1.jpg');
        });

        it('shows fallback icon when image fails to load', () => {
            render(<InstagramGrid posts={mockPosts} onSelect={mockOnSelect} />);

            const images = document.querySelectorAll('img[src^="https://example.com"]');

            // Simulate image load error
            fireEvent.error(images[0]);

            // After error, the image should be replaced with fallback
            // The ImageOff icon should now be visible (rendered as span with data-testid)
            const fallbackContainer = document.querySelector('.bg-slate-200');
            expect(fallbackContainer).toBeInTheDocument();
        });

        it('applies blur class to draft images', () => {
            render(<InstagramGrid posts={mockPosts} onSelect={mockOnSelect} />);

            const images = document.querySelectorAll('img[src^="https://example.com"]');
            // The second image (index 1) is a draft
            expect(images[1]).toHaveClass('blur-[1px]');
        });
    });

    describe('Engagement stats', () => {
        it('displays likes count', () => {
            render(<InstagramGrid posts={mockPosts} onSelect={mockOnSelect} />);

            expect(screen.getByText('100')).toBeInTheDocument();
            expect(screen.getByText('200')).toBeInTheDocument();
            expect(screen.getByText('300')).toBeInTheDocument();
        });

        it('displays comments count', () => {
            render(<InstagramGrid posts={mockPosts} onSelect={mockOnSelect} />);

            expect(screen.getByText('10')).toBeInTheDocument();
            expect(screen.getByText('20')).toBeInTheDocument();
            expect(screen.getByText('30')).toBeInTheDocument();
        });
    });

    describe('Empty state', () => {
        it('renders empty grid with no posts', () => {
            render(<InstagramGrid posts={[]} onSelect={mockOnSelect} />);

            expect(screen.queryAllByRole('img')).toHaveLength(0);
            // Header should still be present
            expect(screen.getByText('Your Brand')).toBeInTheDocument();
        });
    });
});
