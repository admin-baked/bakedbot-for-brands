import { act, fireEvent, render, screen } from '@testing-library/react';
import { HeroCarousel } from '@/components/demo/hero-carousel';
import type { HeroSlide } from '@/types/hero-slides';

jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: any) => <img {...props} alt={props.alt} />,
}));

const slides: HeroSlide[] = [
    {
        id: 'slide-1',
        orgId: 'org-test',
        title: 'First Slide',
        subtitle: 'Welcome',
        description: 'First description',
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
        id: 'slide-2',
        orgId: 'org-test',
        title: 'Second Slide',
        subtitle: 'Special',
        description: 'Second description',
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
];

describe('HeroCarousel component', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('renders provided slides and dot indicators', () => {
        render(<HeroCarousel slides={slides} autoPlay={false} />);

        expect(screen.getByText('First Slide')).toBeInTheDocument();
        const dots = screen.getAllByRole('button', { name: /Go to slide/i });
        expect(dots).toHaveLength(2);
    });

    it('renders default content when no slides are provided', () => {
        render(<HeroCarousel />);

        expect(screen.getByText('20% OFF ALL FLOWER')).toBeInTheDocument();
    });

    it('executes smooth scroll CTA action for scroll targets', () => {
        const target = document.createElement('div');
        target.id = 'products';
        target.scrollIntoView = jest.fn();
        document.body.appendChild(target);

        render(<HeroCarousel slides={slides} autoPlay={false} />);
        fireEvent.click(screen.getByText('Shop Now'));

        expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
        document.body.removeChild(target);
    });

    it('does not render CTA button when ctaAction is none', () => {
        const noActionSlide: HeroSlide = {
            ...slides[0],
            ctaAction: 'none',
            ctaText: 'No Action',
        };

        render(<HeroCarousel slides={[noActionSlide]} autoPlay={false} />);

        expect(screen.queryByText('No Action')).toBeNull();
    });

    it('advances active dot during auto-play interval', async () => {
        jest.useFakeTimers();

        render(<HeroCarousel slides={slides} autoPlay interval={1000} />);
        const dots = screen.getAllByRole('button', { name: /Go to slide/i });

        expect(dots[0].className).toContain('w-8');

        await act(async () => {
            jest.advanceTimersByTime(1100);
        });

        expect(dots[1].className).toContain('w-8');
    });
});
