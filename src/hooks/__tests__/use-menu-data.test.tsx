
import { renderHook, act } from '@testing-library/react';
import { useMenuData } from '../use-menu-data';
import { useDemoMode } from '@/context/demo-mode';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useHasMounted } from '../use-has-mounted';
import { demoProducts, demoLocations } from '@/lib/data';
import type { Product, Location } from '@/lib/types';

// Mock the dependencies
jest.mock('@/context/demo-mode');
jest.mock('@/firebase/firestore/use-collection');
jest.mock('../use-has-mounted');

const mockUseDemoMode = useDemoMode as jest.Mock;
const mockUseCollection = useCollection as jest.Mock;
const mockUseHasMounted = useHasMounted as jest.Mock;

const mockLiveProducts: Product[] = [
  { id: 'live-1', name: 'Live Product 1', category: 'Live', price: 10, prices: {}, imageUrl: '', imageHint: '', description: '' },
];
const mockLiveLocations: Location[] = [
  { id: 'live-loc-1', name: 'Live Location 1', address: '', city: '', state: '', zip: ''},
];

describe('useMenuData', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockUseDemoMode.mockClear();
    mockUseCollection.mockClear();
    mockUseHasMounted.mockClear();
    
    // Default mock implementations
    mockUseHasMounted.mockReturnValue(true);
    mockUseDemoMode.mockReturnValue({ isDemo: false, setIsDemo: jest.fn() });
    mockUseCollection.mockImplementation((query) => {
        // Distinguish between products and locations queries
        if (!query) return { data: [], isLoading: false };
        const path = query._query.path.canonicalString;
        if (path.includes('products')) {
            return { data: mockLiveProducts, isLoading: false };
        }
        if (path.includes('dispensaries')) {
            return { data: mockLiveLocations, isLoading: false };
        }
        return { data: [], isLoading: false };
    });
  });

  it('should return demo data when demo mode is on', () => {
    mockUseDemoMode.mockReturnValue({ isDemo: true, setIsDemo: jest.fn() });

    const { result } = renderHook(() => useMenuData());

    expect(result.current.isDemo).toBe(true);
    expect(result.current.products).toEqual(demoProducts);
    expect(result.current.locations).toEqual(demoLocations);
    expect(result.current.isLoading).toBe(false);
  });

  it('should return live data when demo mode is off and data has loaded', () => {
    const { result } = renderHook(() => useMenuData());

    expect(result.current.isDemo).toBe(false);
    expect(result.current.products).toEqual(mockLiveProducts);
    expect(result.current.locations).toEqual(mockLiveLocations);
    expect(result.current.isLoading).toBe(false);
  });

  it('should return loading state initially when in live mode', () => {
    mockUseCollection.mockReturnValue({ data: null, isLoading: true });
    mockUseHasMounted.mockReturnValue(false); // Simulate initial render

    const { result } = renderHook(() => useMenuData());

    expect(result.current.isLoading).toBe(true);
  });
  
  it('should transition from loading to loaded state', () => {
    
    mockUseCollection.mockReturnValue({ data: null, isLoading: true });
    
    const { result, rerender } = renderHook(() => useMenuData());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.products).toEqual([]); // Should be empty array while loading

    // Simulate data fetching completion
    mockUseCollection.mockImplementation((query) => {
        if (!query) return { data: [], isLoading: false };
        const path = query._query.path.canonicalString;
        if (path.includes('products')) {
            return { data: mockLiveProducts, isLoading: false };
        }
        if (path.includes('dispensaries')) {
            return { data: mockLiveLocations, isLoading: false };
        }
        return { data: [], isLoading: false };
    });

    rerender();
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.products).toEqual(mockLiveProducts);
    expect(result.current.locations).toEqual(mockLiveLocations);
  });

   it('should return empty arrays for live data if useCollection returns null', () => {
    mockUseCollection.mockReturnValue({ data: null, isLoading: false });

    const { result } = renderHook(() => useMenuData());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.products).toEqual([]);
    expect(result.current.locations).toEqual([]);
  });

});
