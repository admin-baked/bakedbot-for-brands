import { render, screen } from '@testing-library/react';
import { DealsCarousel } from '@/components/dispensary/deals-carousel';

describe.skip('DealsCarousel', () => {
    const mockSlides = [
        {
            id: 1,
            title: 'Test Deal 1',
            description: 'Description 1',
            cta: 'Shop Now',
            bgColor: 'bg-red-500',
            textColor: 'text-white'
        },
        {
            id: 2,
            title: 'Test Deal 2',
            description: 'Description 2',
            cta: 'Learn More',
            bgColor: 'bg-blue-500',
            textColor: 'text-white'
        }
    ];

    it('renders nothing when no slides are provided', () => {
        const { container } = render(<DealsCarousel slides={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders slides correctly', () => {
        render(<DealsCarousel slides={mockSlides} />);

        // Using regex for flexibility
        expect(screen.getByText(/Test Deal 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Description 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Shop Now/i)).toBeInTheDocument();
    });
});
