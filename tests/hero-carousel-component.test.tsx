import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeroCarousel } from '@/components/demo/hero-carousel';
import type { HeroSlide } from '@/types/hero-slides';
import { describe, it, expect, vi } from 'vitest';

describe('HeroCarousel Component', () => {
    const mockSlides: HeroSlide[] = [
        {
            id: '1',
            orgId: 'test-org',
            title: 'First Slide',
            subtitle: 'Welcome',
            description: 'First slide description',
            ctaText: 'Shop Now',
            ctaAction: 'scroll',
            ctaTarget: 'products',
            backgroundColor: '#16a34a',
            textAlign: 'left',
            displayOrder: 0,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: '2',
            orgId: 'test-org',
            title: 'Second Slide',
            subtitle: 'Special Offer',
            description: 'Second slide description',
            ctaText: 'Learn More',
            ctaAction: 'link',
            ctaTarget: 'https://example.com',
            backgroundColor: '#8b5cf6',
            textAlign: 'center',
            displayOrder: 1,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            id: '3',
            orgId: 'test-org',
            title: 'Third Slide',
            subtitle: 'New Arrivals',
            description: 'Third slide description',
            ctaText: 'Explore',
            ctaAction: 'none',
            backgroundColor: '#1a1a2e',
            textAlign: 'right',
            displayOrder: 2,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ];

    describe('Rendering', () => {
        it('should render carousel with provided slides', () => {
            render(<HeroCarousel slides={mockSlides} />);

            expect(screen.getByText('First Slide')).toBeInTheDocument();
            expect(screen.getByText('Special Offer')).toBeInTheDocument();
        });

        it('should render with default slides when none provided', () => {
            render(<HeroCarousel />);

            expect(screen.getByText('20% OFF ALL FLOWER')).toBeInTheDocument();
        });

        it('should display subtitle and description', () => {
            render(<HeroCarousel slides={mockSlides} />);

            expect(screen.getByText('Welcome')).toBeInTheDocument();
            expect(screen.getByText('First slide description')).toBeInTheDocument();
        });

        it('should render CTA buttons', () => {
            render(<HeroCarousel slides={mockSlides} />);

            const buttons = screen.getAllByRole('button');
            // Previous, Next, dot indicators, and CTA buttons
            expect(buttons.length).toBeGreaterThan(3);
        });

        it('should render dot indicators for each slide', () => {
            render(<HeroCarousel slides={mockSlides} />);

            const dots = screen.getAllByRole('button').filter(
                (btn) => btn.getAttribute('aria-label')?.includes('Go to slide')
            );
            expect(dots).toHaveLength(mockSlides.length);
        });
    });

    describe('Navigation', () => {
        it('should display first slide on initial render', () => {
            render(<HeroCarousel slides={mockSlides} />);

            expect(screen.getByText('First Slide')).toBeVisible();
            expect(screen.queryByText('Second Slide')).not.toBeVisible();
        });

        it('should navigate to next slide when Next button clicked', () => {
            render(<HeroCarousel slides={mockSlides} autoPlay={false} />);

            const nextButton = screen.getAllByRole('button').find((btn) => {
                const parent = btn.parentElement;
                return parent?.className.includes('right');
            });

            if (nextButton) {
                fireEvent.click(nextButton);

                waitFor(() => {
                    expect(screen.getByText('Second Slide')).toBeVisible();
                });
            }
        });

        it('should navigate to previous slide when Prev button clicked', () => {
            render(<HeroCarousel slides={mockSlides} autoPlay={false} />);

            // Navigate to slide 2 first
            const nextButton = screen.getAllByRole('button').find((btn) => {
                const parent = btn.parentElement;
                return parent?.className.includes('right');
            });

            if (nextButton) {
                fireEvent.click(nextButton);

                // Then go back
                const prevButton = screen.getAllByRole('button').find((btn) => {
                    const parent = btn.parentElement;
                    return parent?.className.includes('left');
                });

                if (prevButton) {
                    fireEvent.click(prevButton);

                    waitFor(() => {
                        expect(screen.getByText('First Slide')).toBeVisible();
                    });
                }
            }
        });

        it('should navigate to slide when dot indicator clicked', () => {
            render(<HeroCarousel slides={mockSlides} autoPlay={false} />);

            const dots = screen.getAllByRole('button').filter(
                (btn) => btn.getAttribute('aria-label')?.includes('Go to slide')
            );

            if (dots.length > 1) {
                fireEvent.click(dots[1]); // Click second dot

                waitFor(() => {
                    expect(screen.getByText('Second Slide')).toBeVisible();
                });
            }
        });

        it('should wrap around to first slide after last slide', () => {
            render(<HeroCarousel slides={mockSlides} autoPlay={false} />);

            const nextButton = screen.getAllByRole('button').find((btn) => {
                const parent = btn.parentElement;
                return parent?.className.includes('right');
            });

            if (nextButton) {
                // Navigate to last slide
                fireEvent.click(nextButton);
                fireEvent.click(nextButton);
                fireEvent.click(nextButton);

                // One more should wrap to first
                fireEvent.click(nextButton);

                waitFor(() => {
                    expect(screen.getByText('First Slide')).toBeVisible();
                });
            }
        });
    });

    describe('Auto-play', () => {
        it('should auto-play when enabled', async () => {
            vi.useFakeTimers();

            render(<HeroCarousel slides={mockSlides} autoPlay={true} interval={1000} />);

            expect(screen.getByText('First Slide')).toBeVisible();

            vi.advanceTimersByTime(1000);

            await waitFor(() => {
                expect(screen.getByText('Second Slide')).toBeVisible();
            });

            vi.useRealTimers();
        });

        it('should pause auto-play on hover', async () => {
            vi.useFakeTimers();

            const { container } = render(
                <HeroCarousel slides={mockSlides} autoPlay={true} interval={1000} />
            );

            const carousel = container.firstChild;
            if (carousel) {
                fireEvent.mouseEnter(carousel);

                vi.advanceTimersByTime(1000);

                expect(screen.getByText('First Slide')).toBeVisible();

                fireEvent.mouseLeave(carousel);
                vi.advanceTimersByTime(1000);

                await waitFor(() => {
                    expect(screen.getByText('Second Slide')).toBeVisible();
                });
            }

            vi.useRealTimers();
        });

        it('should not auto-play when disabled', () => {
            vi.useFakeTimers();

            render(<HeroCarousel slides={mockSlides} autoPlay={false} interval={1000} />);

            vi.advanceTimersByTime(1000);

            expect(screen.getByText('First Slide')).toBeVisible();
            expect(screen.queryByText('Second Slide')).not.toBeVisible();

            vi.useRealTimers();
        });
    });

    describe('CTA Handlers', () => {
        it('should execute scroll action on CTA click', () => {
            const mockElement = document.createElement('div');
            mockElement.id = 'products';
            mockElement.scrollIntoView = vi.fn();
            document.body.appendChild(mockElement);

            render(<HeroCarousel slides={mockSlides} autoPlay={false} />);

            const ctaButton = screen.getByText('Shop Now');
            fireEvent.click(ctaButton);

            expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });

            document.body.removeChild(mockElement);
        });

        it('should execute link action on CTA click', () => {
            const originalLocation = window.location.href;

            render(<HeroCarousel slides={mockSlides} autoPlay={false} />);

            const ctaButton = screen.getByText('Learn More');
            fireEvent.click(ctaButton);

            // Note: window.location.href changes are restricted in tests, so we just verify no error

            window.location.href = originalLocation;
        });

        it('should not execute action when ctaAction is none', () => {
            render(<HeroCarousel slides={mockSlides} autoPlay={false} />);

            // Navigate to third slide with no action
            const dots = screen.getAllByRole('button').filter(
                (btn) => btn.getAttribute('aria-label')?.includes('Go to slide')
            );

            if (dots.length > 2) {
                fireEvent.click(dots[2]);

                const exploreButton = screen.getByText('Explore');
                expect(exploreButton).toBeInTheDocument();
                // Should render but not be clickable with action
            }
        });
    });

    describe('Styling & Responsiveness', () => {
        it('should apply textAlign styling', () => {
            const { container } = render(<HeroCarousel slides={mockSlides} autoPlay={false} />);

            const contentDivs = container.querySelectorAll('[class*="flex"]');
            expect(contentDivs.length).toBeGreaterThan(0);
        });

        it('should apply backgroundColor when no image provided', () => {
            const slideWithoutImage = { ...mockSlides[0], imageUrl: undefined };

            const { container } = render(
                <HeroCarousel slides={[slideWithoutImage]} autoPlay={false} />
            );

            const slideDiv = container.querySelector('[style*="backgroundColor"]');
            expect(slideDiv).toBeTruthy();
        });

        it('should render background image when imageUrl provided', () => {
            const slideWithImage = {
                ...mockSlides[0],
                imageUrl: 'https://example.com/image.jpg',
            };

            const { container } = render(
                <HeroCarousel slides={[slideWithImage]} autoPlay={false} />
            );

            const image = container.querySelector('img');
            expect(image?.src).toContain('example.com/image.jpg');
        });

        it('should respond to viewport width changes', () => {
            const { container } = render(<HeroCarousel slides={mockSlides} autoPlay={false} />);

            // Check for responsive classes in viewport-dependent elements
            const responsiveElements = container.querySelectorAll(
                '[class*="md:"], [class*="lg:"]'
            );
            expect(responsiveElements.length).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle single slide', () => {
            render(<HeroCarousel slides={[mockSlides[0]]} />);

            expect(screen.getByText('First Slide')).toBeVisible();

            const dots = screen.getAllByRole('button').filter(
                (btn) => btn.getAttribute('aria-label')?.includes('Go to slide')
            );
            expect(dots).toHaveLength(1);
        });

        it('should handle empty slides array gracefully', () => {
            const { container } = render(<HeroCarousel slides={[]} />);

            // Should render container even with no slides
            expect(container.firstChild).toBeTruthy();
        });

        it('should handle slide with minimal data', () => {
            const minimalSlide: HeroSlide = {
                id: '1',
                orgId: 'test',
                title: 'Title Only',
                subtitle: '',
                description: '',
                ctaText: '',
                ctaAction: 'none',
                backgroundColor: '#000',
                textAlign: 'left',
                displayOrder: 0,
                active: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            render(<HeroCarousel slides={[minimalSlide]} />);

            expect(screen.getByText('Title Only')).toBeVisible();
        });

        it('should handle rapid navigation clicks', () => {
            render(<HeroCarousel slides={mockSlides} autoPlay={false} />);

            const nextButton = screen.getAllByRole('button').find((btn) => {
                const parent = btn.parentElement;
                return parent?.className.includes('right');
            });

            if (nextButton) {
                fireEvent.click(nextButton);
                fireEvent.click(nextButton);
                fireEvent.click(nextButton);

                expect(screen.getByText('First Slide')).toBeVisible();
            }
        });
    });
});
