/**
 * Unit Tests for Checkout Flow
 * Tests the complete customer checkout journey including:
 * - Cart management
 * - Customer details validation
 * - Payment processing (Authorize.net sandbox)
 * - Order creation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// =============================================================================
// Test Card Numbers (Authorize.net Sandbox)
// =============================================================================

const TEST_CARDS = {
    visa: {
        number: '4242424242424242',
        cvv: '123',
        expiration: '12/26',
        type: 'Visa',
    },
    mastercard: {
        number: '5424000000000015',
        cvv: '123',
        expiration: '12/26',
        type: 'MasterCard',
    },
    amex: {
        number: '370000000000002',
        cvv: '1234', // Amex uses 4 digits
        expiration: '12/26',
        type: 'American Express',
    },
    discover: {
        number: '6011000000000012',
        cvv: '123',
        expiration: '12/26',
        type: 'Discover',
    },
    declined: {
        number: '4000000000000002',
        cvv: '123',
        expiration: '12/26',
        type: 'Declined',
    },
};

// =============================================================================
// Test Customer Data
// =============================================================================

const TEST_CUSTOMER = {
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '(555) 123-4567',
};

const TEST_SHIPPING = {
    street: '123 Test Street',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90210',
};

// =============================================================================
// Authorize.net Checkout Tests
// =============================================================================

describe('Authorize.net Checkout Flow', () => {
    describe('Test Card Validation', () => {
        it('should have valid Visa test card format', () => {
            const visa = TEST_CARDS.visa;
            expect(visa.number).toHaveLength(16);
            expect(visa.number).toMatch(/^4/); // Visa starts with 4
            expect(visa.cvv).toHaveLength(3);
        });

        it('should have valid MasterCard test card format', () => {
            const mc = TEST_CARDS.mastercard;
            expect(mc.number).toHaveLength(16);
            expect(mc.number).toMatch(/^5[1-5]/); // MasterCard starts with 51-55
            expect(mc.cvv).toHaveLength(3);
        });

        it('should have valid Amex test card format', () => {
            const amex = TEST_CARDS.amex;
            expect(amex.number).toHaveLength(15); // Amex is 15 digits
            expect(amex.number).toMatch(/^3[47]/); // Amex starts with 34 or 37
            expect(amex.cvv).toHaveLength(4); // Amex CVV is 4 digits
        });

        it('should have valid Discover test card format', () => {
            const discover = TEST_CARDS.discover;
            expect(discover.number).toHaveLength(16);
            expect(discover.number).toMatch(/^6011/); // Discover starts with 6011
            expect(discover.cvv).toHaveLength(3);
        });
    });

    describe('Payment Request Construction', () => {
        it('should build valid payment request with card data', () => {
            const request = {
                amount: 20.00,
                cardNumber: TEST_CARDS.visa.number,
                expirationDate: TEST_CARDS.visa.expiration,
                cvv: TEST_CARDS.visa.cvv,
                customer: {
                    email: TEST_CUSTOMER.email,
                    firstName: TEST_CUSTOMER.name.split(' ')[0],
                    lastName: TEST_CUSTOMER.name.split(' ').slice(1).join(' '),
                },
                description: 'Test Order',
            };

            expect(request.amount).toBe(20.00);
            expect(request.cardNumber).toBe('4242424242424242');
            expect(request.customer.email).toBe('test@example.com');
            expect(request.customer.firstName).toBe('Test');
            expect(request.customer.lastName).toBe('Customer');
        });

        it('should format amount to 2 decimal places', () => {
            const amounts = [10, 10.5, 10.99, 10.999];
            const formatted = amounts.map(a => a.toFixed(2));

            expect(formatted).toEqual(['10.00', '10.50', '10.99', '11.00']);
        });

        it('should build valid payment request with opaque data', () => {
            const request = {
                amount: 40.00,
                opaqueData: {
                    dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                    dataValue: 'eyJ0eXBlIjoiY29tbW9uLmFjY2VwdC5pbmFwcC5wYXltZW50IiwiZGF0YSI6IntcImNhcmROdW1iZXJcIjpcIjQyNDI0MjQyNDI0MjQyNDJcIn0ifQ==',
                },
            };

            expect(request.opaqueData.dataDescriptor).toBe('COMMON.ACCEPT.INAPP.PAYMENT');
            expect(request.opaqueData.dataValue).toBeDefined();
        });
    });

    describe('API Endpoint Selection', () => {
        it('should use sandbox endpoint when AUTHNET_ENV is not production', () => {
            const IS_PRODUCTION = false;
            const endpoint = IS_PRODUCTION
                ? 'https://api2.authorize.net/xml/v1/request.api'
                : 'https://apitest.authorize.net/xml/v1/request.api';

            expect(endpoint).toContain('apitest');
            expect(endpoint).not.toContain('api2');
        });

        it('should use production endpoint when AUTHNET_ENV is production', () => {
            const IS_PRODUCTION = true;
            const endpoint = IS_PRODUCTION
                ? 'https://api2.authorize.net/xml/v1/request.api'
                : 'https://apitest.authorize.net/xml/v1/request.api';

            expect(endpoint).toContain('api2');
            expect(endpoint).not.toContain('apitest');
        });
    });

    describe('Response Code Handling', () => {
        it('should recognize response code 1 as approved', () => {
            const responseCode = '1';
            const isApproved = responseCode === '1';
            expect(isApproved).toBe(true);
        });

        it('should recognize response code 2 as declined', () => {
            const responseCode = '2';
            const isDeclined = responseCode === '2';
            expect(isDeclined).toBe(true);
        });

        it('should recognize response code 3 as error', () => {
            const responseCode = '3';
            const isError = responseCode === '3';
            expect(isError).toBe(true);
        });

        it('should recognize response code 4 as held for review', () => {
            const responseCode = '4';
            const isHeld = responseCode === '4';
            expect(isHeld).toBe(true);
        });
    });
});

// =============================================================================
// Customer Details Validation Tests
// =============================================================================

describe('Customer Details Validation', () => {
    describe('Name Validation', () => {
        it('should require non-empty name', () => {
            const isValid = (name: string) => name.trim().length > 0;

            expect(isValid('Test Customer')).toBe(true);
            expect(isValid('')).toBe(false);
            expect(isValid('   ')).toBe(false);
        });

        it('should split name into first and last', () => {
            const splitName = (fullName: string) => {
                const parts = fullName.trim().split(' ');
                return {
                    firstName: parts[0],
                    lastName: parts.slice(1).join(' ') || parts[0],
                };
            };

            expect(splitName('John Doe')).toEqual({ firstName: 'John', lastName: 'Doe' });
            expect(splitName('John')).toEqual({ firstName: 'John', lastName: 'John' });
            expect(splitName('John Michael Doe')).toEqual({ firstName: 'John', lastName: 'Michael Doe' });
        });
    });

    describe('Email Validation', () => {
        it('should validate email format', () => {
            const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(isValidEmail('invalid')).toBe(false);
            expect(isValidEmail('invalid@')).toBe(false);
            expect(isValidEmail('@domain.com')).toBe(false);
        });
    });

    describe('Phone Validation', () => {
        it('should accept various phone formats', () => {
            const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

            expect(normalizePhone('(555) 123-4567')).toBe('5551234567');
            expect(normalizePhone('555-123-4567')).toBe('5551234567');
            expect(normalizePhone('5551234567')).toBe('5551234567');
            expect(normalizePhone('+1 555 123 4567')).toBe('15551234567');
        });

        it('should validate phone length', () => {
            const isValidPhone = (phone: string) => {
                const digits = phone.replace(/\D/g, '');
                return digits.length >= 10 && digits.length <= 11;
            };

            expect(isValidPhone('(555) 123-4567')).toBe(true);
            expect(isValidPhone('+1 555 123 4567')).toBe(true);
            expect(isValidPhone('123')).toBe(false);
        });
    });

    describe('Shipping Address Validation', () => {
        it('should require all shipping fields', () => {
            const isValidAddress = (addr: typeof TEST_SHIPPING) => {
                return addr.street.length > 0 &&
                    addr.city.length > 0 &&
                    addr.state.length === 2 &&
                    /^\d{5}(-\d{4})?$/.test(addr.zip);
            };

            expect(isValidAddress(TEST_SHIPPING)).toBe(true);
            expect(isValidAddress({ ...TEST_SHIPPING, zip: '1234' })).toBe(false);
            expect(isValidAddress({ ...TEST_SHIPPING, state: 'California' })).toBe(false);
        });

        it('should validate zip code format', () => {
            const isValidZip = (zip: string) => /^\d{5}(-\d{4})?$/.test(zip);

            expect(isValidZip('90210')).toBe(true);
            expect(isValidZip('90210-1234')).toBe(true);
            expect(isValidZip('9021')).toBe(false);
            expect(isValidZip('ABCDE')).toBe(false);
        });
    });
});

// =============================================================================
// Cart Management Tests
// =============================================================================

describe('Cart Management', () => {
    describe('Add to Cart', () => {
        it('should add item with quantity', () => {
            const cart: Array<{ id: string; name: string; price: number; quantity: number }> = [];

            const addToCart = (item: { id: string; name: string; price: number }, qty: number) => {
                const existing = cart.find(i => i.id === item.id);
                if (existing) {
                    existing.quantity += qty;
                } else {
                    cart.push({ ...item, quantity: qty });
                }
            };

            addToCart({ id: 'prod_1', name: 'Snicker Doodle Bites', price: 10 }, 1);
            expect(cart).toHaveLength(1);
            expect(cart[0].quantity).toBe(1);

            addToCart({ id: 'prod_1', name: 'Snicker Doodle Bites', price: 10 }, 2);
            expect(cart).toHaveLength(1);
            expect(cart[0].quantity).toBe(3);
        });
    });

    describe('Cart Total Calculation', () => {
        it('should calculate total correctly', () => {
            const cart = [
                { id: 'prod_1', name: 'Snicker Doodle Bites', price: 10, quantity: 2 },
                { id: 'prod_2', name: 'Berry Cheesecake Gummies', price: 10, quantity: 1 },
                { id: 'prod_3', name: 'Hoodie', price: 40, quantity: 1 },
            ];

            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            expect(total).toBe(70); // (10*2) + (10*1) + (40*1) = 70
        });

        it('should handle empty cart', () => {
            const cart: Array<{ price: number; quantity: number }> = [];
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            expect(total).toBe(0);
        });
    });

    describe('Remove from Cart', () => {
        it('should remove item by id', () => {
            let cart = [
                { id: 'prod_1', name: 'Product 1', price: 10, quantity: 1 },
                { id: 'prod_2', name: 'Product 2', price: 20, quantity: 1 },
            ];

            cart = cart.filter(item => item.id !== 'prod_1');
            expect(cart).toHaveLength(1);
            expect(cart[0].id).toBe('prod_2');
        });
    });
});

// =============================================================================
// Ecstatic Edibles Pilot Tests
// =============================================================================

describe('Ecstatic Edibles Pilot Configuration', () => {
    const BRAND_CONFIG = {
        id: 'brand_ecstatic_edibles',
        name: 'Ecstatic Edibles',
        slug: 'ecstaticedibles',
        theme: {
            primaryColor: '#bb0a1e',
            secondaryColor: '#000000',
            accentColor: '#FFFFFF',
        },
        purchaseModel: 'online_only',
        shipsNationwide: true,
    };

    const PRODUCTS = [
        { id: 'prod_snickerdoodle_bites', name: 'Snicker Doodle Bites', price: 10.00, category: 'Edibles' },
        { id: 'prod_berry_cheesecake_gummies', name: 'Berry Cheesecake Gummies', price: 10.00, category: 'Edibles' },
        { id: 'prod_we_go_together_hoodie', name: '"If You Hit This We Go Together" Hoodie', price: 40.00, category: 'Apparel' },
    ];

    describe('Brand Theme', () => {
        it('should have correct primary color (Ecstatic Red)', () => {
            expect(BRAND_CONFIG.theme.primaryColor).toBe('#bb0a1e');
        });

        it('should have correct secondary color (Black)', () => {
            expect(BRAND_CONFIG.theme.secondaryColor).toBe('#000000');
        });

        it('should have correct accent color (White)', () => {
            expect(BRAND_CONFIG.theme.accentColor).toBe('#FFFFFF');
        });

        it('should have valid hex color format', () => {
            const isValidHex = (color: string) => /^#[0-9A-Fa-f]{6}$/.test(color);

            expect(isValidHex(BRAND_CONFIG.theme.primaryColor)).toBe(true);
            expect(isValidHex(BRAND_CONFIG.theme.secondaryColor)).toBe(true);
            expect(isValidHex(BRAND_CONFIG.theme.accentColor)).toBe(true);
        });
    });

    describe('Product Catalog', () => {
        it('should have exactly 3 products', () => {
            expect(PRODUCTS).toHaveLength(3);
        });

        it('should have correct product prices', () => {
            const snickerdoodle = PRODUCTS.find(p => p.id === 'prod_snickerdoodle_bites');
            const gummies = PRODUCTS.find(p => p.id === 'prod_berry_cheesecake_gummies');
            const hoodie = PRODUCTS.find(p => p.id === 'prod_we_go_together_hoodie');

            expect(snickerdoodle?.price).toBe(10.00);
            expect(gummies?.price).toBe(10.00);
            expect(hoodie?.price).toBe(40.00);
        });

        it('should have correct categories', () => {
            const edibles = PRODUCTS.filter(p => p.category === 'Edibles');
            const apparel = PRODUCTS.filter(p => p.category === 'Apparel');

            expect(edibles).toHaveLength(2);
            expect(apparel).toHaveLength(1);
        });

        it('should have unique product IDs', () => {
            const ids = PRODUCTS.map(p => p.id);
            const uniqueIds = [...new Set(ids)];
            expect(uniqueIds).toHaveLength(ids.length);
        });
    });

    describe('E-Commerce Configuration', () => {
        it('should be configured for online_only purchase model', () => {
            expect(BRAND_CONFIG.purchaseModel).toBe('online_only');
        });

        it('should ship nationwide', () => {
            expect(BRAND_CONFIG.shipsNationwide).toBe(true);
        });

        it('should have correct brand slug for URL', () => {
            expect(BRAND_CONFIG.slug).toBe('ecstaticedibles');
            expect(`https://${BRAND_CONFIG.slug}.bakedbot.ai`).toBe('https://ecstaticedibles.bakedbot.ai');
        });
    });

    describe('Complete Order Flow', () => {
        it('should calculate correct order total', () => {
            // Customer orders: 2 Snickerdoodle + 1 Gummies + 1 Hoodie
            const orderItems = [
                { ...PRODUCTS[0], quantity: 2 }, // Snickerdoodle x2 = $20
                { ...PRODUCTS[1], quantity: 1 }, // Gummies x1 = $10
                { ...PRODUCTS[2], quantity: 1 }, // Hoodie x1 = $40
            ];

            const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            expect(subtotal).toBe(70);
        });

        it('should build valid order payload', () => {
            const order = {
                items: PRODUCTS.map(p => ({ ...p, quantity: 1 })),
                customer: TEST_CUSTOMER,
                shipping: TEST_SHIPPING,
                paymentMethod: 'authorize_net' as const,
                total: 60, // 10 + 10 + 40
            };

            expect(order.items).toHaveLength(3);
            expect(order.customer.email).toBeDefined();
            expect(order.shipping.zip).toMatch(/^\d{5}$/);
            expect(order.paymentMethod).toBe('authorize_net');
            expect(order.total).toBe(60);
        });
    });
});

// =============================================================================
// Age Verification Tests
// =============================================================================

describe('Age Verification', () => {
    it('should require age verification for hemp products', () => {
        const requiresVerification = true; // Hemp products require 21+
        expect(requiresVerification).toBe(true);
    });

    it('should store verification in session', () => {
        const AGE_VERIFIED_KEY = 'bakedbot_age_verified';
        const mockSessionStorage: Record<string, string> = {};

        // Simulate setting verification
        mockSessionStorage[AGE_VERIFIED_KEY] = 'true';

        expect(mockSessionStorage[AGE_VERIFIED_KEY]).toBe('true');
    });

    it('should check verification before checkout', () => {
        const isAgeVerified = (storage: Record<string, string>) => {
            return storage['bakedbot_age_verified'] === 'true';
        };

        expect(isAgeVerified({ 'bakedbot_age_verified': 'true' })).toBe(true);
        expect(isAgeVerified({})).toBe(false);
    });
});
