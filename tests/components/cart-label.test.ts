/**
 * Tests for Floating Cart Pill Label Logic
 * @jest-environment jsdom
 */

describe('Cart Label Logic', () => {
    // Helper function extracted from floating-cart-pill.tsx
    function getCartLabel(pathname: string): string {
        if (pathname.startsWith('/dispensaries/') && !pathname.includes('/near/')) {
            return 'Pickup Cart';
        }
        if (pathname.startsWith('/brands/') && !pathname.includes('/near/')) {
            return 'Brand Cart';
        }
        if (pathname.includes('/near/') || pathname.startsWith('/local/')) {
            return 'Order Cart';
        }
        return 'Hemp Cart';
    }

    describe('Dispensary Pages', () => {
        it('should return "Pickup Cart" for global dispensary page', () => {
            expect(getCartLabel('/dispensaries/sunnyside')).toBe('Pickup Cart');
        });

        it('should return "Pickup Cart" for dispensary with complex slug', () => {
            expect(getCartLabel('/dispensaries/green-thumb-chicago')).toBe('Pickup Cart');
        });

        it('should return "Order Cart" for dispensary near ZIP page', () => {
            expect(getCartLabel('/dispensaries/sunnyside/near/60605')).toBe('Order Cart');
        });
    });

    describe('Brand Pages', () => {
        it('should return "Brand Cart" for global brand page', () => {
            expect(getCartLabel('/brands/cookies')).toBe('Brand Cart');
        });

        it('should return "Brand Cart" for brand with complex slug', () => {
            expect(getCartLabel('/brands/40-tons-cannabis')).toBe('Brand Cart');
        });

        it('should return "Order Cart" for brand near ZIP page', () => {
            expect(getCartLabel('/brands/cookies/near/90210')).toBe('Order Cart');
        });
    });

    describe('Local Pages', () => {
        it('should return "Order Cart" for local ZIP page', () => {
            expect(getCartLabel('/local/48201')).toBe('Order Cart');
        });

        it('should return "Order Cart" for local city page', () => {
            expect(getCartLabel('/local/detroit-mi')).toBe('Order Cart');
        });
    });

    describe('Default Pages', () => {
        it('should return "Hemp Cart" for shop page', () => {
            expect(getCartLabel('/shop')).toBe('Hemp Cart');
        });

        it('should return "Hemp Cart" for home page', () => {
            expect(getCartLabel('/')).toBe('Hemp Cart');
        });

        it('should return "Hemp Cart" for demo page', () => {
            expect(getCartLabel('/demo')).toBe('Hemp Cart');
        });

        it('should return "Hemp Cart" for dashboard pages', () => {
            expect(getCartLabel('/dashboard/playbooks')).toBe('Hemp Cart');
        });
    });
});
