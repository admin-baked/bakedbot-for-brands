import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CarouselGenerator } from '../carousel-generator';
import '@testing-library/jest-dom';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Sparkles: ({ className }: { className?: string }) => <span data-testid="sparkles-icon" className={className}>✨</span>,
    Loader2: ({ className }: { className?: string }) => <span data-testid="loader-icon" className={className}>⏳</span>,
    ImageIcon: ({ className }: { className?: string }) => <span data-testid="image-icon" className={className}>🖼️</span>,
    Wand2: ({ className }: { className?: string }) => <span data-testid="wand-icon" className={className}>🪄</span>,
    Check: ({ className }: { className?: string }) => <span data-testid="check-icon" className={className}>✓</span>,
    AlertCircle: ({ className }: { className?: string }) => <span data-testid="alert-icon" className={className}>⚠️</span>,
    ChevronLeft: ({ className }: { className?: string }) => <span className={className}>←</span>,
    ChevronRight: ({ className }: { className?: string }) => <span className={className}>→</span>,
    ArrowRight: ({ className }: { className?: string }) => <span className={className}>→</span>,
    ChevronDown: ({ className }: { className?: string }) => <span className={className}>▼</span>,
}));

// Mock UI components with Select issues
jest.mock('@/components/ui/select', () => ({
    Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
        <div data-testid="select">{children}</div>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
        <div data-testid={`select-item-${value}`}>{children}</div>
    ),
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <button data-testid="select-trigger">{children}</button>,
    SelectValue: () => <span>Value</span>,
}));

// Mock HeroCarousel component
jest.mock('@/components/demo/hero-carousel', () => ({
    HeroCarousel: ({ slides }: { slides: Array<{ id: string; title: string }> }) => (
        <div data-testid="hero-carousel">
            {slides.map(slide => (
                <div key={slide.id} data-testid="carousel-slide">{slide.title}</div>
            ))}
        </div>
    ),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('CarouselGenerator', () => {
    const defaultProps = {
        brandId: 'test-brand-123',
        brandName: 'Test Brand',
        primaryColor: '#DC2626',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
    });

    describe('Initial render', () => {
        it('renders the component title', () => {
            render(<CarouselGenerator {...defaultProps} />);
            expect(screen.getByText('AI Carousel Generator')).toBeInTheDocument();
        });

        it('renders the prompt textarea', () => {
            render(<CarouselGenerator {...defaultProps} />);
            expect(screen.getByPlaceholderText(/Holiday sale with festive colors/i)).toBeInTheDocument();
        });

        it('renders the generate button', () => {
            render(<CarouselGenerator {...defaultProps} />);
            expect(screen.getByRole('button', { name: /Generate Carousel/i })).toBeInTheDocument();
        });

        it('disables generate button when prompt is empty', () => {
            render(<CarouselGenerator {...defaultProps} />);
            const button = screen.getByRole('button', { name: /Generate Carousel/i });
            expect(button).toBeDisabled();
        });
    });

    describe('Form inputs', () => {
        it('updates prompt value on input', () => {
            render(<CarouselGenerator {...defaultProps} />);
            const textarea = screen.getByPlaceholderText(/Holiday sale/i);
            fireEvent.change(textarea, { target: { value: 'Summer vibes beach theme' } });
            expect(textarea).toHaveValue('Summer vibes beach theme');
        });

        it('enables generate button when prompt is provided', () => {
            render(<CarouselGenerator {...defaultProps} />);
            const textarea = screen.getByPlaceholderText(/Holiday sale/i);
            fireEvent.change(textarea, { target: { value: 'Test prompt' } });
            const button = screen.getByRole('button', { name: /Generate Carousel/i });
            expect(button).not.toBeDisabled();
        });
    });

    describe('Slide count selector', () => {
        it('shows slide count options', () => {
            render(<CarouselGenerator {...defaultProps} />);
            expect(screen.getByText('Number of Slides')).toBeInTheDocument();
        });
    });

    describe('Image quality selector', () => {
        it('shows image quality options', () => {
            render(<CarouselGenerator {...defaultProps} />);
            expect(screen.getByText('Image Quality')).toBeInTheDocument();
        });
    });

    describe('Generation flow', () => {
        it('shows loading state during generation', async () => {
            mockFetch.mockImplementation(() =>
                new Promise(resolve =>
                    setTimeout(() =>
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({ slides: [] }),
                        }),
                        100
                    )
                )
            );

            render(<CarouselGenerator {...defaultProps} />);
            const textarea = screen.getByPlaceholderText(/Holiday sale/i);
            fireEvent.change(textarea, { target: { value: 'Test prompt' } });

            const button = screen.getByRole('button', { name: /Generate Carousel/i });
            fireEvent.click(button);

            expect(await screen.findByText(/Generating/i)).toBeInTheDocument();
        });

        it('displays generated slides after successful generation', async () => {
            const mockSlides = [
                { id: 'slide-1', title: 'SUMMER SALE', subtitle: 'Limited Time', description: 'Save big!', ctaText: 'Shop Now' },
                { id: 'slide-2', title: 'NEW ARRIVALS', subtitle: 'Fresh Drop', description: 'Check it out', ctaText: 'Browse' },
            ];

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ slides: mockSlides }),
            });

            render(<CarouselGenerator {...defaultProps} />);
            const textarea = screen.getByPlaceholderText(/Holiday sale/i);
            fireEvent.change(textarea, { target: { value: 'Summer sale theme' } });

            const button = screen.getByRole('button', { name: /Generate Carousel/i });
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByTestId('hero-carousel')).toBeInTheDocument();
            });

            expect(screen.getByText('SUMMER SALE')).toBeInTheDocument();
            expect(screen.getByText('NEW ARRIVALS')).toBeInTheDocument();
        });

        it('shows error message on generation failure', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                json: () => Promise.resolve({ error: 'Generation failed' }),
            });

            render(<CarouselGenerator {...defaultProps} />);
            const textarea = screen.getByPlaceholderText(/Holiday sale/i);
            fireEvent.change(textarea, { target: { value: 'Test prompt' } });

            const button = screen.getByRole('button', { name: /Generate Carousel/i });
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/Generation failed/i)).toBeInTheDocument();
            });
        });

        it('shows success message after generation', async () => {
            const mockSlides = [
                { id: 'slide-1', title: 'TEST', subtitle: 'Test', description: 'Test', ctaText: 'Shop' },
            ];

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ slides: mockSlides }),
            });

            render(<CarouselGenerator {...defaultProps} />);
            const textarea = screen.getByPlaceholderText(/Holiday sale/i);
            fireEvent.change(textarea, { target: { value: 'Test prompt' } });

            const button = screen.getByRole('button', { name: /Generate Carousel/i });
            fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText(/Generated 1 carousel slides/i)).toBeInTheDocument();
            });
        });
    });

    describe('API request', () => {
        it('sends correct payload to API', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ slides: [] }),
            });

            render(<CarouselGenerator {...defaultProps} />);
            const textarea = screen.getByPlaceholderText(/Holiday sale/i);
            fireEvent.change(textarea, { target: { value: 'Holiday promo' } });

            const button = screen.getByRole('button', { name: /Generate Carousel/i });
            fireEvent.click(button);

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith(
                    '/api/creative/generate-carousel',
                    expect.objectContaining({
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: expect.stringContaining('Holiday promo'),
                    })
                );
            });
        });

        it('includes brandId in API request', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ slides: [] }),
            });

            render(<CarouselGenerator {...defaultProps} />);
            const textarea = screen.getByPlaceholderText(/Holiday sale/i);
            fireEvent.change(textarea, { target: { value: 'Test' } });

            const button = screen.getByRole('button', { name: /Generate Carousel/i });
            fireEvent.click(button);

            await waitFor(() => {
                const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
                expect(callBody.brandId).toBe('test-brand-123');
            });
        });
    });

    describe('Save functionality', () => {
        it('shows save button when onSave prop is provided and slides are generated', async () => {
            const mockOnSave = jest.fn();
            const mockSlides = [
                { id: 'slide-1', title: 'TEST', subtitle: 'Test', description: 'Test', ctaText: 'Shop' },
            ];

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ slides: mockSlides }),
            });

            render(<CarouselGenerator {...defaultProps} onSave={mockOnSave} />);
            const textarea = screen.getByPlaceholderText(/Holiday sale/i);
            fireEvent.change(textarea, { target: { value: 'Test prompt' } });

            const generateButton = screen.getByRole('button', { name: /Generate Carousel/i });
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Save Carousel/i })).toBeInTheDocument();
            });
        });

        it('calls onSave with generated slides when save is clicked', async () => {
            const mockOnSave = jest.fn().mockResolvedValue(undefined);
            const mockSlides = [
                { id: 'slide-1', title: 'TEST', subtitle: 'Test', description: 'Test', ctaText: 'Shop' },
            ];

            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ slides: mockSlides }),
            });

            render(<CarouselGenerator {...defaultProps} onSave={mockOnSave} />);
            const textarea = screen.getByPlaceholderText(/Holiday sale/i);
            fireEvent.change(textarea, { target: { value: 'Test prompt' } });

            const generateButton = screen.getByRole('button', { name: /Generate Carousel/i });
            fireEvent.click(generateButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Save Carousel/i })).toBeInTheDocument();
            });

            const saveButton = screen.getByRole('button', { name: /Save Carousel/i });
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalledWith(mockSlides);
            });
        });
    });
});
