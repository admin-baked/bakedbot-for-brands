
import { renderHook, act } from '@testing-library/react';
import { useCart } from '../use-cart';
import type { Product } from '@/lib/types';

// Mock product data for testing
const mockProduct1: Product = {
  id: 'prod-1',
  name: 'Cosmic Caramels',
  category: 'Edibles',
  price: 25.00,
  prices: { loc1: 25.00, loc2: 27.00 },
  imageUrl: 'url1',
  imageHint: 'caramel',
  description: 'Chewy, rich caramels.',
};

const mockProduct2: Product = {
  id: 'prod-2',
  name: 'Giggle Gummies',
  category: 'Edibles',
  price: 20.00,
  prices: { loc1: 20.00, loc2: 22.00 },
  imageUrl: 'url2',
  imageHint: 'gummy',
  description: 'Fruity, fun, and uplifting.',
};


describe('useCart hook', () => {

    beforeEach(() => {
        // Reset the store's state before each test
        act(() => {
            useCart.getState().clearCart();
        });
    });

    it('should add a new item to the cart', () => {
        const { result } = renderHook(() => useCart());

        act(() => {
            result.current.addToCart(mockProduct1, 'loc1');
        });

        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].id).toBe('prod-1');
        expect(result.current.items[0].quantity).toBe(1);
        expect(result.current.items[0].price).toBe(25.00); // Should use location-specific price
    });
    
    it('should increment the quantity of an existing item', () => {
        const { result } = renderHook(() => useCart());

        act(() => {
            result.current.addToCart(mockProduct1, 'loc1');
        });
        act(() => {
            result.current.addToCart(mockProduct1, 'loc1');
        });

        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].quantity).toBe(2);
    });

    it('should update an items quantity correctly', () => {
        const { result } = renderHook(() => useCart());

        act(() => {
            result.current.addToCart(mockProduct1, 'loc1');
        });
        act(() => {
            result.current.updateQuantity('prod-1', 5);
        });

        expect(result.current.items[0].quantity).toBe(5);
    });
    
     it('should remove an item if quantity is updated to 0', () => {
        const { result } = renderHook(() => useCart());

        act(() => {
            result.current.addToCart(mockProduct1, 'loc1');
        });
        act(() => {
            result.current.updateQuantity('prod-1', 0);
        });

        expect(result.current.items).toHaveLength(0);
    });

    it('should remove an item from the cart', () => {
        const { result } = renderHook(() => useCart());
        
        act(() => {
            result.current.addToCart(mockProduct1, 'loc1');
            result.current.addToCart(mockProduct2, 'loc1');
        });

        expect(result.current.items).toHaveLength(2);

        act(() => {
            result.current.removeFromCart('prod-1');
        });

        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].id).toBe('prod-2');
    });

    it('should clear the entire cart', () => {
        const { result } = renderHook(() => useCart());
        
        act(() => {
            result.current.addToCart(mockProduct1, 'loc1');
            result.current.addToCart(mockProduct2, 'loc1');
        });
        
        expect(result.current.items).toHaveLength(2);

        act(() => {
            result.current.clearCart();
        });

        expect(result.current.items).toHaveLength(0);
    });
    
     it('should correctly calculate the item count', () => {
        const { result } = renderHook(() => useCart());
        
        act(() => {
            result.current.addToCart(mockProduct1, 'loc1'); // qty 1
            result.current.addToCart(mockProduct1, 'loc1'); // qty 2
            result.current.addToCart(mockProduct2, 'loc1'); // qty 1
        });
        
        let count = 0;
        act(() => {
           count = result.current.getItemCount();
        });
        
        expect(count).toBe(3);
    });

    it('should correctly calculate totals', () => {
        const { result } = renderHook(() => useCart());

        act(() => {
            result.current.addToCart(mockProduct1, 'loc1'); // 1 * 25.00
            result.current.addToCart(mockProduct2, 'loc1'); // 1 * 20.00
            result.current.addToCart(mockProduct2, 'loc1'); // 2 * 20.00
        });
        
        let totals = { subtotal: 0, taxes: 0, total: 0 };
        act(() => {
            totals = result.current.getCartTotal();
        });
        
        // subtotal = (1 * 25) + (2 * 20) = 25 + 40 = 65
        expect(totals.subtotal).toBe(65.00);
        // taxes = 65 * 0.15 = 9.75
        expect(totals.taxes).toBe(9.75);
        // total = 65 + 9.75 = 74.75
        expect(totals.total).toBe(74.75);
    });

     it('should use default price if location-specific price is not available', () => {
        const { result } = renderHook(() => useCart());

        // Add product with a location that doesn't have a specific price
        act(() => {
            result.current.addToCart(mockProduct1, 'loc-unknown');
        });

        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].price).toBe(25.00); // Falls back to default price
    });
});
