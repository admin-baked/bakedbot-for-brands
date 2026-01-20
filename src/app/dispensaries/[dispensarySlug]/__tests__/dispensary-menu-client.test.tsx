/**
 * Unit tests for Dispensary Menu Client component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock all external dependencies
jest.mock('@/hooks/use-store', () => ({
    useStore: () => ({
        addToCart: jest.fn(),
        cartItems: [],
        clearCart: jest.fn(),
        removeFromCart: jest.fn(),
        updateQuantity: jest.fn(),
    }),
}));

jest.mock('@/components/demo/demo-header', () => ({
    DemoHeader: ({ brandName, onCartClick }: any) => (
        <header data-testid="demo-header">
            <span>{brandName}</span>
            <button onClick={onCartClick} data-testid="cart-button">Cart</button>
        </header>
    ),
}));

jest.mock('@/components/demo/demo-footer', () => ({
    DemoFooter: ({ brandName }: any) => (
        <footer data-testid="demo-footer">{brandName}</footer>
    ),
}));

jest.mock('@/components/demo/hero-carousel', () => ({
    HeroCarousel: () => <div data-testid="hero-carousel">Hero Carousel</div>,
}));

jest.mock('@/components/demo/featured-brands-carousel', () => ({
    FeaturedBrandsCarousel: () => <div data-testid="featured-brands">Featured Brands</div>,
}));

jest.mock('@/components/demo/category-grid', () => ({
    CategoryGrid: ({ onCategoryClick }: any) => (
        <div data-testid="category-grid">
            <button onClick={() => onCategoryClick('Flower')}>Flower</button>
        </div>
    ),
}));

jest.mock('@/components/demo/bundle-deals-section', () => ({
    BundleDealsSection: () => <div data-testid="bundle-deals">Bundle Deals</div>,
}));

jest.mock('@/components/demo/product-section', () => ({
    ProductSection: ({ title, products }: any) => (
        <div data-testid="product-section">
            <h2>{title}</h2>
            <span>{products.length} products</span>
        </div>
    ),
}));

jest.mock('@/components/demo/oversized-product-card', () => ({
    OversizedProductCard: ({ product, onAddToCart }: any) => (
        <div data-testid={`product-card-${product.id}`}>
            <span>{product.name}</span>
            <button onClick={() => onAddToCart(product, 1)}>Add to Cart</button>
        </div>
    ),
}));

jest.mock('@/components/demo/cart-slide-over', () => ({
    CartSlideOver: ({ open, onClose }: any) => (
        open ? <div data-testid="cart-slideover"><button onClick={onClose}>Close</button></div> : null
    ),
}));

jest.mock('@/components/demo/bundle-detail-dialog', () => ({
    BundleDetailDialog: () => null,
}));

jest.mock('@/components/demo/product-detail-modal', () => ({
    ProductDetailModal: () => null,
}));

jest.mock('@/components/chatbot', () => ({
    __esModule: true,
    default: () => <div data-testid="chatbot">Chatbot</div>,
}));

// Import after mocks
import { DispensaryMenuClient } from '../dispensary-menu-client';
import type { Product, Retailer } from '@/types/domain';

describe('DispensaryMenuClient', () => {
    const mockDispensary: Retailer & { primaryColor?: string; hours?: string } = {
        id: 'disp-123',
        name: 'Green Leaf Dispensary',
        address: '123 Main St',
        city: 'Denver',
        state: 'CO',
        zip: '80202',
        phone: '555-1234',
        primaryColor: '#16a34a',
        hours: '9AM - 9PM',
    };

    const mockProducts: Product[] = [
        {
            id: 'prod-1',
            name: 'Blue Dream',
            category: 'Flower',
            price: 45,
            imageUrl: '/blue-dream.jpg',
            imageHint: 'cannabis flower',
            description: 'Sativa-dominant hybrid',
            brandId: 'brand-1',
            likes: 100,
            thcPercent: 24,
        },
        {
            id: 'prod-2',
            name: 'Gummy Bears',
            category: 'Edibles',
            price: 25,
            imageUrl: '/gummies.jpg',
            imageHint: 'edible gummies',
            description: '10mg THC per gummy',
            brandId: 'brand-2',
            likes: 80,
            thcPercent: 10,
        },
        {
            id: 'prod-3',
            name: 'Vape Cartridge',
            category: 'Vapes',
            price: 35,
            imageUrl: '/vape.jpg',
            imageHint: 'vape cartridge',
            description: '500mg distillate',
            brandId: 'brand-1',
            likes: 60,
            thcPercent: 85,
        },
    ];

    it('should render the dispensary name in header and footer', () => {
        render(
            <DispensaryMenuClient
                dispensary={mockDispensary}
                products={mockProducts}
            />
        );

        expect(screen.getByTestId('demo-header')).toHaveTextContent('Green Leaf Dispensary');
        expect(screen.getByTestId('demo-footer')).toHaveTextContent('Green Leaf Dispensary');
    });

    it('should render all main sections', () => {
        render(
            <DispensaryMenuClient
                dispensary={mockDispensary}
                products={mockProducts}
            />
        );

        expect(screen.getByTestId('hero-carousel')).toBeInTheDocument();
        expect(screen.getByTestId('featured-brands')).toBeInTheDocument();
        expect(screen.getByTestId('category-grid')).toBeInTheDocument();
        expect(screen.getByTestId('bundle-deals')).toBeInTheDocument();
    });

    it('should render product sections with correct counts', () => {
        render(
            <DispensaryMenuClient
                dispensary={mockDispensary}
                products={mockProducts}
            />
        );

        // Should have featured products section
        const productSections = screen.getAllByTestId('product-section');
        expect(productSections.length).toBeGreaterThan(0);
    });

    it('should render the chatbot', () => {
        render(
            <DispensaryMenuClient
                dispensary={mockDispensary}
                products={mockProducts}
            />
        );

        expect(screen.getByTestId('chatbot')).toBeInTheDocument();
    });

    it('should open cart when cart button is clicked', async () => {
        render(
            <DispensaryMenuClient
                dispensary={mockDispensary}
                products={mockProducts}
            />
        );

        // Cart should not be visible initially
        expect(screen.queryByTestId('cart-slideover')).not.toBeInTheDocument();

        // Click cart button
        fireEvent.click(screen.getByTestId('cart-button'));

        // Cart should now be visible
        await waitFor(() => {
            expect(screen.getByTestId('cart-slideover')).toBeInTheDocument();
        });
    });

    it('should render product cards in the all products section', () => {
        render(
            <DispensaryMenuClient
                dispensary={mockDispensary}
                products={mockProducts}
            />
        );

        // Should display product count
        expect(screen.getByText('3 products available')).toBeInTheDocument();

        // Should render individual product cards
        expect(screen.getByTestId('product-card-prod-1')).toBeInTheDocument();
        expect(screen.getByTestId('product-card-prod-2')).toBeInTheDocument();
        expect(screen.getByTestId('product-card-prod-3')).toBeInTheDocument();
    });

    it('should filter products by category when category is selected', async () => {
        render(
            <DispensaryMenuClient
                dispensary={mockDispensary}
                products={mockProducts}
            />
        );

        // Click on Flower category
        fireEvent.click(screen.getByText('Flower'));

        // Should now show only 1 product (Blue Dream)
        await waitFor(() => {
            expect(screen.getByText('1 products available')).toBeInTheDocument();
        });
    });

    it('should handle empty products gracefully', () => {
        render(
            <DispensaryMenuClient
                dispensary={mockDispensary}
                products={[]}
            />
        );

        expect(screen.getByText('No products found')).toBeInTheDocument();
    });

    it('should use default primary color when not provided', () => {
        const dispensaryWithoutColor = { ...mockDispensary };
        delete dispensaryWithoutColor.primaryColor;

        render(
            <DispensaryMenuClient
                dispensary={dispensaryWithoutColor}
                products={mockProducts}
            />
        );

        // Component should render without errors
        expect(screen.getByTestId('demo-header')).toBeInTheDocument();
    });

    it('should handle bundles prop', () => {
        const mockBundles = [
            {
                id: 'bundle-1',
                name: 'Starter Pack',
                description: 'Great for beginners',
                type: 'fixed_price' as const,
                status: 'active' as const,
                createdBy: 'dispensary' as const,
                products: [],
                originalTotal: 60,
                bundlePrice: 45,
                savingsAmount: 15,
                savingsPercent: 25,
                currentRedemptions: 0,
                featured: true,
                createdAt: new Date(),
                updatedAt: new Date(),
                orgId: 'org-1',
            },
        ];

        render(
            <DispensaryMenuClient
                dispensary={mockDispensary}
                products={mockProducts}
                bundles={mockBundles}
            />
        );

        expect(screen.getByTestId('bundle-deals')).toBeInTheDocument();
    });
});

describe('DispensaryMenuClient - Search and Filter', () => {
    const mockDispensary: Retailer = {
        id: 'disp-123',
        name: 'Test Dispensary',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip: '12345',
    };

    const mockProducts: Product[] = [
        { id: '1', name: 'Blue Dream Flower', category: 'Flower', price: 45, imageUrl: '', imageHint: '', description: 'Sativa', brandId: 'b1', likes: 100 },
        { id: '2', name: 'OG Kush Flower', category: 'Flower', price: 50, imageUrl: '', imageHint: '', description: 'Indica', brandId: 'b1', likes: 90 },
        { id: '3', name: 'Gummy Bears', category: 'Edibles', price: 25, imageUrl: '', imageHint: '', description: 'Sweet', brandId: 'b2', likes: 80 },
    ];

    it('should sort products by price low to high', async () => {
        render(
            <DispensaryMenuClient
                dispensary={mockDispensary}
                products={mockProducts}
            />
        );

        // Find and click the sort dropdown
        const sortTrigger = screen.getByRole('combobox', { name: /sort by/i });
        fireEvent.click(sortTrigger);

        // Select price low to high
        const priceLowOption = await screen.findByText('Price: Low to High');
        fireEvent.click(priceLowOption);

        // First product should now be the cheapest (Gummy Bears at $25)
        const productCards = screen.getAllByTestId(/product-card/);
        expect(productCards[0]).toHaveTextContent('Gummy Bears');
    });

    it('should clear filters when clear button is clicked', async () => {
        render(
            <DispensaryMenuClient
                dispensary={mockDispensary}
                products={mockProducts}
            />
        );

        // Select a category first
        fireEvent.click(screen.getByText('Flower'));

        await waitFor(() => {
            expect(screen.getByText('2 products available')).toBeInTheDocument();
        });

        // Click clear filters
        fireEvent.click(screen.getByText('Clear Filters'));

        await waitFor(() => {
            expect(screen.getByText('3 products available')).toBeInTheDocument();
        });
    });
});
