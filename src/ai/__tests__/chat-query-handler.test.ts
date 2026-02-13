
import { QueryAnalysisSchema } from '../chat-query-handler';

describe('QueryAnalysisSchema', () => {
    it('should validate checkout intent with product', () => {
        const input = {
            searchType: 'checkout',
            checkoutParams: {
                action: 'create_order',
                productName: 'Blue Dream',
                quantity: 2
            },
            searchQuery: 'buy blue dream',
            intent: 'User wants to buy Blue Dream'
        };

        const result = QueryAnalysisSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.searchType).toBe('checkout');
            expect(result.data.checkoutParams?.action).toBe('create_order');
            expect(result.data.checkoutParams?.productName).toBe('Blue Dream');
        }
    });

    it('should validate checkout intent for viewing cart', () => {
        const input = {
            searchType: 'checkout',
            checkoutParams: {
                action: 'view_cart'
            },
            searchQuery: 'checkout',
            intent: 'User wants to checkout'
        };

        const result = QueryAnalysisSchema.safeParse(input);
        expect(result.success).toBe(true);
        expect(result.data.checkoutParams?.action).toBe('view_cart');
    });

    it('should validate filters with checkout intent if mixed (edge case)', () => {
        // Even if searchType is checkout, filters might be present if the schema allows it (it works because filters is optional but not mutually exclusive in schema structure)
        const input = {
            searchType: 'checkout',
            filters: {
                priceMax: 50
            },
            checkoutParams: {
                action: 'create_order',
                productName: 'Gummies'
            },
            searchQuery: 'buy cheap gummies',
            intent: 'buy gummies'
        };

        const result = QueryAnalysisSchema.safeParse(input);
        expect(result.success).toBe(true);
    });
});
