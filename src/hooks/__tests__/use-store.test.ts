import { act, renderHook } from '@testing-library/react';
import { useStore } from '../use-store';
import { demoProducts } from '@/lib/data';
import type { Product } from '@/lib/types';

// The product to be used in tests
const testProduct: Product = demoProducts[0]; // Cosmic Caramels, price: 25.00

describe('useStore - Cart Logic', () => {

  // Reset store before each test to ensure isolation
  beforeEach(() => {
    act(() => {
      useStore.setState({ cartItems: [], selectedLocationId: 'loc1' });
    });
  });

  it('should add a new item to the cart', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.addToCart(testProduct, 'loc1');
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].id).toBe(testProduct.id);
    expect(result.current.cartItems[0].quantity).toBe(1);
  });

  it('should increment the quantity of an existing item', () => {
    const { result } = renderHook(() => useStore());

    // Add the item twice
    act(() => {
      result.current.addToCart(testProduct, 'loc1');
      result.current.addToCart(testProduct, 'loc1');
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].quantity).toBe(2);
  });

  it('should update the quantity of an item', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.addToCart(testProduct, 'loc1');
    });
    
    act(() => {
      result.current.updateQuantity(testProduct.id, 5);
    });

    expect(result.current.cartItems[0].quantity).toBe(5);
  });

  it('should remove an item if quantity is updated to 0 or less', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.addToCart(testProduct, 'loc1');
    });

    act(() => {
      result.current.updateQuantity(testProduct.id, 0);
    });

    expect(result.current.cartItems).toHaveLength(0);
  });

  it('should remove an item from the cart', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.addToCart(testProduct, 'loc1');
    });
    expect(result.current.cartItems).toHaveLength(1);

    act(() => {
      result.current.removeFromCart(testProduct.id);
    });

    expect(result.current.cartItems).toHaveLength(0);
  });

  it('should clear the entire cart', () => {
    const { result } = renderHook(() => useStore());
    const anotherProduct = demoProducts[1];

    act(() => {
      result.current.addToCart(testProduct, 'loc1');
      result.current.addToCart(anotherProduct, 'loc1');
    });
    expect(result.current.cartItems).toHaveLength(2);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cartItems).toHaveLength(0);
  });

  it('should correctly calculate cart totals', () => {
    const { result } = renderHook(() => useStore());

    act(() => {
      result.current.addToCart(testProduct, 'loc1'); // 25.00
      result.current.updateQuantity(testProduct.id, 2); // 50.00
    });

    const totals = result.current.getCartTotal();
    
    // Subtotal should be 2 * 25.00 = 50.00
    expect(totals.subtotal).toBe(50.00);
    // Tax is 15% of subtotal
    expect(totals.taxes).toBeCloseTo(7.50);
    // Total is subtotal + tax
    expect(totals.total).toBeCloseTo(57.50);
  });

  it('should return a total item count', () => {
    const { result } = renderHook(() => useStore());
    const anotherProduct = demoProducts[1];

    act(() => {
      result.current.addToCart(testProduct, 'loc1'); // qty 1
      result.current.addToCart(testProduct, 'loc1'); // qty 2
      result.current.addToCart(anotherProduct, 'loc1'); // qty 1
    });

    expect(result.current.getItemCount()).toBe(3);
  });
});
