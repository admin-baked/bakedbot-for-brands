
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LocalProductCard } from '../local-product-card';
import { LocalProduct } from '@/types/foot-traffic';

// Mock properties
const mockProduct: LocalProduct = {
    id: 'p1',
    name: 'Test Product',
    brandName: 'Test Brand',
    price: 35,
    originalPrice: 40,
    size: '1g',
    thcPercent: 85,
    isOnSale: true,
    footTrafficScore: 90,
    imageUrl: 'http://example.com/img.jpg',
    availability: [],
    retailerCount: 5,
    nearestDistance: 1.2
};

describe('LocalProductCard', () => {
    it('renders product details correctly', () => {
        render(<LocalProductCard product={mockProduct} />);

        expect(screen.getByText('Test Product')).toBeInTheDocument();
        expect(screen.getByText('Test Brand')).toBeInTheDocument();
        expect(screen.getByText('85% THC')).toBeInTheDocument();
    });

    it('displays sale price and original price', () => {
        render(<LocalProductCard product={mockProduct} />);
        expect(screen.getByText('$35.00')).toBeInTheDocument();
        expect(screen.getByText('$40.00')).toHaveClass('line-through');
    });

    it('displays size context (P2.1)', () => {
        render(<LocalProductCard product={mockProduct} />);
        // Price and size are in separate elements
        expect(screen.getByText('$35.00')).toBeInTheDocument();
        expect(screen.getByText('1g')).toBeInTheDocument();
    });

    it('hides "0%" THC if zero (P0.1)', () => {
        const zeroThcProduct = { ...mockProduct, thcPercent: 0 };
        render(<LocalProductCard product={zeroThcProduct} />);
        expect(screen.queryByText(/0% THC/)).not.toBeInTheDocument();
    });
});
