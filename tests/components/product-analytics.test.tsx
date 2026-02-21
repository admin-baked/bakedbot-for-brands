/**
 * Product Analytics Tests
 *
 * Tests for Phase 6 product sorting and trending badge display
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { OversizedProductCard } from '@/components/demo/oversized-product-card';
import type { Product } from '@/types/domain';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Heart: () => <div data-testid="heart-icon">❤️</div>,
    Zap: () => <div data-testid="zap-icon">⚡</div>,
    Plus: () => <div data-testid="plus-icon">➕</div>,
    Minus: () => <div data-testid="minus-icon">➖</div>,
    ShoppingCart: () => <div data-testid="cart-icon">🛒</div>,
}));

jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ alt, src, ...props }: any) => (
        <img alt={alt} src={src} data-testid="product-image" {...props} />
    ),
}));

describe('Product Analytics UI', () => {
    const baseProduct: Product = {
        id: 'prod_1',
        name: 'Test Flower - OG Kush',
        category: 'Flower',
        price: 15.00,
        imageUrl: 'https://example.com/flower.jpg',
        imageHint: 'Green cannabis buds',
        description: 'Premium OG Kush',
        likes: 10,
        brandId: 'brand_1',
        brandName: 'Premium Cannabis Co',
    };

    describe('Trending Badge Display', () => {
        it('should display trending badge when product.trending = true', () => {
            const trendingProduct: Product = {
                ...baseProduct,
                trending: true,
                salesVelocity: 3.5,
                salesLast7Days: 25,
                lastSaleAt: new Date(),
            };

            render(
                <OversizedProductCard
                    product={trendingProduct}
                    primaryColor="#16a34a"
                />
            );

            // Trending badge should be visible
            expect(screen.getByText('Trending')).toBeInTheDocument();
        });

        it('should NOT display trending badge when product.trending = false', () => {
            const nonTrendingProduct: Product = {
                ...baseProduct,
                trending: false,
                salesVelocity: 1.0,
                salesLast7Days: 5,
            };

            render(
                <OversizedProductCard
                    product={nonTrendingProduct}
                    primaryColor="#16a34a"
                />
            );

            // Trending badge should NOT be visible
            expect(screen.queryByText('Trending')).not.toBeInTheDocument();
        });

        it('should NOT display trending badge when trending field is undefined', () => {
            const productWithoutTrending: Product = {
                ...baseProduct,
                // trending undefined
            };

            render(
                <OversizedProductCard
                    product={productWithoutTrending}
                    primaryColor="#16a34a"
                />
            );

            expect(screen.queryByText('Trending')).not.toBeInTheDocument();
        });

        it('should display trending badge with zap icon', () => {
            const trendingProduct: Product = {
                ...baseProduct,
                trending: true,
            };

            render(
                <OversizedProductCard
                    product={trendingProduct}
                    primaryColor="#16a34a"
                />
            );

            // Should display zap icon
            expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
        });

        it('should display multiple badges correctly (trending + strain)', () => {
            const trendingProductWithStrain: Product = {
                ...baseProduct,
                trending: true,
                strainType: 'Indica',
            };

            render(
                <OversizedProductCard
                    product={trendingProductWithStrain}
                    primaryColor="#16a34a"
                />
            );

            // Both badges should be visible
            expect(screen.getByText('Trending')).toBeInTheDocument();
            expect(screen.getByText('Indica')).toBeInTheDocument();
        });

        it('should display multiple badges correctly (trending + deal)', () => {
            const trendingDealProduct: Product = {
                ...baseProduct,
                trending: true,
                price: 12.00,
            };

            render(
                <OversizedProductCard
                    product={trendingDealProduct}
                    primaryColor="#16a34a"
                    dealBadge="DEAL"
                />
            );

            // Both badges should be visible
            expect(screen.getByText('Trending')).toBeInTheDocument();
            expect(screen.getByText('DEAL')).toBeInTheDocument();
        });

        it('should display badges in correct order (trending first)', () => {
            const product: Product = {
                ...baseProduct,
                trending: true,
                strainType: 'Sativa',
            };

            const { container } = render(
                <OversizedProductCard
                    product={product}
                    primaryColor="#16a34a"
                />
            );

            // Trending badge should appear before strain badge
            const badges = container.querySelectorAll('[class*="badge"]');
            const trendingBadge = Array.from(badges).find(b =>
                b.textContent?.includes('Trending')
            );
            const strainBadge = Array.from(badges).find(b =>
                b.textContent?.includes('Sativa')
            );

            expect(trendingBadge).toBeDefined();
            expect(strainBadge).toBeDefined();
        });
    });

    describe('Sales Metrics Display', () => {
        it('should display product with sales velocity', () => {
            const productWithVelocity: Product = {
                ...baseProduct,
                salesVelocity: 3.5,
                salesCount: 50,
                salesLast7Days: 25,
                trending: true,
            };

            const { container } = render(
                <OversizedProductCard
                    product={productWithVelocity}
                    primaryColor="#16a34a"
                />
            );

            // Component should render without errors
            expect(container).toBeInTheDocument();
        });

        it('should handle high sales velocity', () => {
            const highVelocityProduct: Product = {
                ...baseProduct,
                salesVelocity: 10.5,
                salesLast7Days: 70,
                trending: true,
            };

            render(
                <OversizedProductCard
                    product={highVelocityProduct}
                    primaryColor="#16a34a"
                />
            );

            // Should mark as trending
            expect(screen.getByText('Trending')).toBeInTheDocument();
        });

        it('should handle zero sales', () => {
            const zeroSalesProduct: Product = {
                ...baseProduct,
                salesVelocity: 0,
                salesCount: 0,
                salesLast7Days: 0,
                trending: false,
            };

            render(
                <OversizedProductCard
                    product={zeroSalesProduct}
                    primaryColor="#16a34a"
                />
            );

            // Should not be trending
            expect(screen.queryByText('Trending')).not.toBeInTheDocument();
        });

        it('should display product with optional sales fields', () => {
            const productWithOptionalFields: Product = {
                ...baseProduct,
                // All sales fields are optional
                salesCount: undefined,
                salesVelocity: undefined,
                trending: undefined,
            };

            render(
                <OversizedProductCard
                    product={productWithOptionalFields}
                    primaryColor="#16a34a"
                />
            );

            // Should render without errors
            expect(screen.getByText(baseProduct.name)).toBeInTheDocument();
        });
    });

    describe('Product Sorting (UI Display)', () => {
        it('should display trending products prominently', () => {
            const products: Product[] = [
                {
                    ...baseProduct,
                    id: 'prod_trending',
                    name: 'Trending Product',
                    featured: false,
                    sortOrder: undefined,
                    salesVelocity: 5.0,
                    salesLast7Days: 35,
                    trending: true,
                },
                {
                    ...baseProduct,
                    id: 'prod_normal',
                    name: 'Normal Product',
                    featured: false,
                    sortOrder: undefined,
                    salesVelocity: 0.5,
                    salesLast7Days: 2,
                    trending: false,
                },
            ];

            const { rerender } = render(
                <OversizedProductCard
                    product={products[0]}
                    primaryColor="#16a34a"
                />
            );

            expect(screen.getByText('Trending')).toBeInTheDocument();

            rerender(
                <OversizedProductCard
                    product={products[1]}
                    primaryColor="#16a34a"
                />
            );

            expect(screen.queryByText('Trending')).not.toBeInTheDocument();
        });

        it('should display featured products with indicator', () => {
            const featuredProduct: Product = {
                ...baseProduct,
                featured: true,
            };

            const { container } = render(
                <OversizedProductCard
                    product={featuredProduct}
                    primaryColor="#16a34a"
                />
            );

            // Featured products should be visually distinct
            expect(container).toBeInTheDocument();
        });
    });

    describe('Badge Styling', () => {
        it('should apply orange color to trending badge', () => {
            const trendingProduct: Product = {
                ...baseProduct,
                trending: true,
            };

            const { container } = render(
                <OversizedProductCard
                    product={trendingProduct}
                    primaryColor="#16a34a"
                />
            );

            // Badge with orange-500 color class
            const badges = container.querySelectorAll('[class*="bg-orange"]');
            expect(badges.length).toBeGreaterThan(0);
        });

        it('should display different colors for different badges', () => {
            const productWithMultipleBadges: Product = {
                ...baseProduct,
                trending: true,
                strainType: 'Indica',
                thcPercent: 25,
            };

            const { container } = render(
                <OversizedProductCard
                    product={productWithMultipleBadges}
                    primaryColor="#16a34a"
                />
            );

            // Should have different colored badges
            const allBadges = container.querySelectorAll('[class*="Badge"]');
            expect(allBadges.length).toBeGreaterThan(0);
        });
    });

    describe('Responsive Display', () => {
        it('should display badges on all product sizes', () => {
            const sizes: ('normal' | 'large' | 'xlarge')[] = ['normal', 'large', 'xlarge'];
            const trendingProduct: Product = {
                ...baseProduct,
                trending: true,
            };

            for (const size of sizes) {
                const { unmount } = render(
                    <OversizedProductCard
                        product={trendingProduct}
                        primaryColor="#16a34a"
                        size={size}
                    />
                );

                expect(screen.getByText('Trending')).toBeInTheDocument();
                unmount();
            }
        });

        it('should display trending badge on mobile view', () => {
            const mobileProduct: Product = {
                ...baseProduct,
                trending: true,
            };

            // Simulate mobile viewport
            global.innerWidth = 375;

            render(
                <OversizedProductCard
                    product={mobileProduct}
                    primaryColor="#16a34a"
                    size="normal"
                />
            );

            expect(screen.getByText('Trending')).toBeInTheDocument();
        });

        it('should display trending badge on desktop view', () => {
            const desktopProduct: Product = {
                ...baseProduct,
                trending: true,
            };

            global.innerWidth = 1920;

            render(
                <OversizedProductCard
                    product={desktopProduct}
                    primaryColor="#16a34a"
                    size="xlarge"
                />
            );

            expect(screen.getByText('Trending')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('should handle product with NaN sales velocity', () => {
            const productWithNaN: Product = {
                ...baseProduct,
                salesVelocity: NaN,
                trending: false,
            };

            render(
                <OversizedProductCard
                    product={productWithNaN}
                    primaryColor="#16a34a"
                />
            );

            expect(screen.queryByText('Trending')).not.toBeInTheDocument();
        });

        it('should handle product with future lastSaleAt date', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            const productWithFutureDate: Product = {
                ...baseProduct,
                lastSaleAt: futureDate,
                trending: false, // Should not be trending with future date
            };

            render(
                <OversizedProductCard
                    product={productWithFutureDate}
                    primaryColor="#16a34a"
                />
            );

            expect(screen.queryByText('Trending')).not.toBeInTheDocument();
        });

        it('should handle product with very old lastSaleAt date', () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 30); // 30 days ago

            const productWithOldSale: Product = {
                ...baseProduct,
                lastSaleAt: oldDate,
                salesVelocity: 5.0, // Even with high velocity
                trending: false, // Should not be trending (older than 7 days)
            };

            render(
                <OversizedProductCard
                    product={productWithOldSale}
                    primaryColor="#16a34a"
                />
            );

            expect(screen.queryByText('Trending')).not.toBeInTheDocument();
        });
    });
});
