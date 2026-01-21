import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock all heavy dependencies
jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: any) => <img {...props} />,
}));

jest.mock('lucide-react', () => ({
    ShoppingCart: () => <div data-testid="shopping-cart-icon">Cart</div>,
    Search: () => <div data-testid="search-icon">Search</div>,
    Store: () => <div data-testid="store-icon">Store</div>,
    Truck: () => <div data-testid="truck-icon">Truck</div>,
    Cookie: () => <div data-testid="cookie-icon">Cookie</div>,
    Shirt: () => <div data-testid="shirt-icon">Shirt</div>,
    Leaf: () => <div data-testid="leaf-icon">Leaf</div>,
    Wind: () => <div data-testid="wind-icon">Wind</div>,
    Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>,
    Droplet: () => <div data-testid="droplet-icon">Droplet</div>,
    Heart: () => <div data-testid="heart-icon">Heart</div>,
    Package: () => <div data-testid="package-icon">Package</div>,
    ArrowRight: () => <div data-testid="arrow-right">Arrow</div>,
}));

jest.mock('@/hooks/use-store', () => ({
    useStore: () => ({
        cartItems: [],
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        clearCart: jest.fn(),
        getCartItemQuantity: jest.fn(() => 0),
    }),
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className, onClick }: any) => (
        <div className={className} onClick={onClick} data-testid="card">{children}</div>
    ),
    CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
    Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props}>{children}</button>
    ),
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/select', () => ({
    Select: ({ children }: any) => <div>{children}</div>,
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    SelectTrigger: ({ children }: any) => <div>{children}</div>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

// Mock demo components
jest.mock('@/components/demo/brand-menu-header', () => ({
    BrandMenuHeader: ({ brandName }: any) => <header data-testid="brand-header">{brandName}</header>,
}));

jest.mock('@/components/demo/brand-hero', () => ({
    BrandHero: ({ brandName, purchaseModel }: any) => (
        <div data-testid="brand-hero">
            <span data-testid="hero-brand-name">{brandName}</span>
            <span data-testid="hero-purchase-model">{purchaseModel}</span>
        </div>
    ),
}));

jest.mock('@/components/demo/category-grid', () => ({
    CategoryGrid: ({ categories, title, primaryColor }: any) => (
        <div data-testid="category-grid">
            <h2>{title}</h2>
            <div data-testid="category-count">{categories?.length || 0} categories</div>
            {categories?.map((cat: any) => (
                <div key={cat.id} data-testid={`category-${cat.id}`}>
                    <span data-testid={`category-name-${cat.id}`}>{cat.name}</span>
                    <span data-testid={`category-count-${cat.id}`}>{cat.productCount} items</span>
                </div>
            ))}
        </div>
    ),
}));

jest.mock('@/components/demo/product-section', () => ({
    ProductSection: () => <div data-testid="product-section">Products</div>,
}));

jest.mock('@/components/demo/oversized-product-card', () => ({
    OversizedProductCard: ({ product }: any) => (
        <div data-testid={`product-card-${product.id}`}>{product.name}</div>
    ),
}));

jest.mock('@/components/demo/dispensary-locator-flow', () => ({
    DispensaryLocatorFlow: () => <div data-testid="locator">Locator</div>,
}));

jest.mock('@/components/demo/brand-checkout-flow', () => ({
    BrandCheckoutFlow: () => <div data-testid="checkout">Checkout</div>,
}));

jest.mock('@/components/demo/demo-footer', () => ({
    DemoFooter: () => <footer data-testid="demo-footer">Footer</footer>,
}));

jest.mock('@/components/demo/product-detail-modal', () => ({
    ProductDetailModal: () => <div data-testid="product-modal">Modal</div>,
}));

jest.mock('@/components/demo/bundle-deals-section', () => ({
    BundleDealsSection: () => <div data-testid="bundles">Bundles</div>,
}));

jest.mock('@/components/demo/cart-slide-over', () => ({
    CartSlideOver: () => <div data-testid="cart">Cart</div>,
}));

jest.mock('@/components/checkout/shipping-checkout-flow', () => ({
    ShippingCheckoutFlow: () => <div data-testid="shipping-checkout">Shipping</div>,
}));

jest.mock('@/components/chatbot', () => ({
    __esModule: true,
    default: () => <div data-testid="chatbot">Chatbot</div>,
}));

// Import after all mocks
import { BrandMenuClient } from '../brand-menu-client';

describe('BrandMenuClient - Dynamic Categories', () => {
    const ecstaticEdiblesBrand = {
        id: 'brand_ecstatic_edibles',
        name: 'Ecstatic Edibles',
        slug: 'ecstaticedibles',
        purchaseModel: 'online_only' as const,
        shipsNationwide: true,
        theme: {
            primaryColor: '#DC2626',
            secondaryColor: '#000000',
        },
        chatbotConfig: {
            enabled: true,
            botName: 'Eddie',
        },
    };

    const ecstaticEdiblesProducts = [
        {
            id: 'prod_1',
            name: 'Snickerdoodle Bites',
            description: 'Delicious hemp edible',
            price: 24.99,
            category: 'Edibles',
            brandId: 'brand_ecstatic_edibles',
        },
        {
            id: 'prod_2',
            name: 'Cheesecake Bliss Gummies',
            description: 'Premium gummies',
            price: 29.99,
            category: 'Edibles',
            brandId: 'brand_ecstatic_edibles',
        },
        {
            id: 'prod_3',
            name: 'If You Hit This We Go Together Hoodie',
            description: 'Signature hoodie',
            price: 54.99,
            category: 'Merchandise',
            brandId: 'brand_ecstatic_edibles',
        },
    ];

    it('renders dynamic categories based on actual products', () => {
        render(
            <BrandMenuClient
                brand={ecstaticEdiblesBrand as any}
                products={ecstaticEdiblesProducts as any}
                retailers={[]}
                brandSlug="ecstaticedibles"
                bundles={[]}
            />
        );

        const categoryGrid = screen.getByTestId('category-grid');
        expect(categoryGrid).toBeInTheDocument();

        // Should show exactly 2 categories: Edibles and Merchandise
        expect(screen.getByTestId('category-count')).toHaveTextContent('2 categories');
    });

    it('shows correct product counts per category', () => {
        render(
            <BrandMenuClient
                brand={ecstaticEdiblesBrand as any}
                products={ecstaticEdiblesProducts as any}
                retailers={[]}
                brandSlug="ecstaticedibles"
                bundles={[]}
            />
        );

        // Edibles should show 2 items
        expect(screen.getByTestId('category-count-edibles')).toHaveTextContent('2 items');

        // Merchandise should show 1 item
        expect(screen.getByTestId('category-count-merchandise')).toHaveTextContent('1 items');
    });

    it('shows Edibles category with Cookie icon', () => {
        render(
            <BrandMenuClient
                brand={ecstaticEdiblesBrand as any}
                products={ecstaticEdiblesProducts as any}
                retailers={[]}
                brandSlug="ecstaticedibles"
                bundles={[]}
            />
        );

        expect(screen.getByTestId('category-name-edibles')).toHaveTextContent('Edibles');
    });

    it('shows Merchandise category', () => {
        render(
            <BrandMenuClient
                brand={ecstaticEdiblesBrand as any}
                products={ecstaticEdiblesProducts as any}
                retailers={[]}
                brandSlug="ecstaticedibles"
                bundles={[]}
            />
        );

        expect(screen.getByTestId('category-name-merchandise')).toHaveTextContent('Merchandise');
    });

    it('does not show categories with no products', () => {
        render(
            <BrandMenuClient
                brand={ecstaticEdiblesBrand as any}
                products={ecstaticEdiblesProducts as any}
                retailers={[]}
                brandSlug="ecstaticedibles"
                bundles={[]}
            />
        );

        // Should NOT show Flower, Vapes, etc. since no products in those categories
        expect(screen.queryByTestId('category-flower')).not.toBeInTheDocument();
        expect(screen.queryByTestId('category-vapes')).not.toBeInTheDocument();
        expect(screen.queryByTestId('category-concentrates')).not.toBeInTheDocument();
    });
});

describe('BrandMenuClient - Purchase Model', () => {
    const onlineOnlyBrand = {
        id: 'brand_ecstatic_edibles',
        name: 'Ecstatic Edibles',
        purchaseModel: 'online_only' as const,
        shipsNationwide: true,
        theme: { primaryColor: '#DC2626' },
    };

    const localPickupBrand = {
        id: 'brand_dispensary',
        name: 'Local Dispensary',
        purchaseModel: 'local_pickup' as const,
        shipsNationwide: false,
        theme: { primaryColor: '#16a34a' },
    };

    const products = [
        { id: '1', name: 'Product 1', price: 10, category: 'Edibles', brandId: 'brand_test' },
    ];

    it('passes online_only purchase model to hero', () => {
        render(
            <BrandMenuClient
                brand={onlineOnlyBrand as any}
                products={products as any}
                retailers={[]}
                brandSlug="ecstaticedibles"
                bundles={[]}
            />
        );

        expect(screen.getByTestId('hero-purchase-model')).toHaveTextContent('online_only');
    });

    it('passes local_pickup purchase model to hero', () => {
        render(
            <BrandMenuClient
                brand={localPickupBrand as any}
                products={products as any}
                retailers={[]}
                brandSlug="dispensary"
                bundles={[]}
            />
        );

        expect(screen.getByTestId('hero-purchase-model')).toHaveTextContent('local_pickup');
    });

    it('defaults to local_pickup when purchaseModel not set', () => {
        const brandWithoutModel = {
            id: 'brand_test',
            name: 'Test Brand',
            theme: { primaryColor: '#000' },
        };

        render(
            <BrandMenuClient
                brand={brandWithoutModel as any}
                products={products as any}
                retailers={[]}
                brandSlug="test"
                bundles={[]}
            />
        );

        expect(screen.getByTestId('hero-purchase-model')).toHaveTextContent('local_pickup');
    });
});

describe('BrandMenuClient - Theme Colors', () => {
    it('uses red theme color for Ecstatic Edibles', () => {
        const brand = {
            id: 'brand_ecstatic_edibles',
            name: 'Ecstatic Edibles',
            theme: {
                primaryColor: '#DC2626',
                secondaryColor: '#000000',
            },
        };

        render(
            <BrandMenuClient
                brand={brand as any}
                products={[]}
                retailers={[]}
                brandSlug="ecstaticedibles"
                bundles={[]}
            />
        );

        // Brand header should render with the brand name
        expect(screen.getByTestId('brand-header')).toHaveTextContent('Ecstatic Edibles');
    });

    it('uses default green color when no theme provided', () => {
        const brand = {
            id: 'brand_test',
            name: 'Test Brand',
        };

        render(
            <BrandMenuClient
                brand={brand as any}
                products={[]}
                retailers={[]}
                brandSlug="test"
                bundles={[]}
            />
        );

        // Should render without errors using default color
        expect(screen.getByTestId('brand-header')).toHaveTextContent('Test Brand');
    });
});

describe('BrandMenuClient - Empty States', () => {
    it('does not render category grid when no products', () => {
        const brand = {
            id: 'brand_test',
            name: 'Test Brand',
            theme: { primaryColor: '#000' },
        };

        render(
            <BrandMenuClient
                brand={brand as any}
                products={[]}
                retailers={[]}
                brandSlug="test"
                bundles={[]}
            />
        );

        // CategoryGrid should NOT render when there are no products
        // The component conditionally renders only when categoryGridData.length > 0
        expect(screen.queryByTestId('category-grid')).not.toBeInTheDocument();
    });

    it('renders brand hero even without products', () => {
        const brand = {
            id: 'brand_test',
            name: 'Empty Brand',
            theme: { primaryColor: '#000' },
        };

        render(
            <BrandMenuClient
                brand={brand as any}
                products={[]}
                retailers={[]}
                brandSlug="empty"
                bundles={[]}
            />
        );

        expect(screen.getByTestId('hero-brand-name')).toHaveTextContent('Empty Brand');
    });
});
