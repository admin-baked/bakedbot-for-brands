/**
 * Unit & Integration Tests for MenuFilterSidebar Logic
 *
 * Tests the pure filter logic extracted from menu-filter-sidebar.tsx:
 * - MenuFilters type / EMPTY_FILTERS sentinel values
 * - countFor() per-option product count logic
 * - Product filter intersection (all 5 filter types)
 * - Price range sentinel handling (0 / 99999 = no-filter)
 * - Active filter count calculation
 * - Toggle helper behaviour
 * - effectivePriceRange sentinel resolution
 * - Edge cases: empty products, missing optional fields
 */

import { describe, it, expect } from '@jest/globals';

// ─── Types (mirrors menu-filter-sidebar.tsx) ──────────────────────────────────

interface MenuFilters {
  strainTypes: string[];
  weights: number[];
  brands: string[];
  terpenes: string[];
  priceRange: [number, number];
}

const EMPTY_FILTERS: MenuFilters = {
  strainTypes: [],
  weights: [],
  brands: [],
  terpenes: [],
  priceRange: [0, 99999],
};

// ─── Helpers (mirrors component implementations) ──────────────────────────────

interface Product {
  id: string;
  price: number;
  strainType?: string;
  weight?: number;
  brandName?: string;
  terpenes?: { name: string; percent: number }[];
}

/** Immutable toggle — mirrors toggle<T> in sidebar */
function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
}

/** Per-option product count respecting all OTHER active filters */
function countFor(
  products: Product[],
  filters: MenuFilters,
  field: keyof MenuFilters,
  value: string | number,
): number {
  return products.filter(p => {
    const stOk =
      field === 'strainTypes' ||
      filters.strainTypes.length === 0 ||
      filters.strainTypes.includes(p.strainType ?? '');
    const wOk =
      field === 'weights' ||
      filters.weights.length === 0 ||
      (p.weight != null && filters.weights.includes(p.weight));
    const bOk =
      field === 'brands' ||
      filters.brands.length === 0 ||
      filters.brands.includes(p.brandName ?? '');
    const tOk =
      field === 'terpenes' ||
      filters.terpenes.length === 0 ||
      p.terpenes?.some(tp => filters.terpenes.includes(tp.name)) === true;
    const prOk =
      (filters.priceRange[0] <= 0 || p.price >= filters.priceRange[0]) &&
      (filters.priceRange[1] >= 99999 || p.price <= filters.priceRange[1]);

    let matchesThis = false;
    if (field === 'strainTypes') matchesThis = p.strainType === value;
    else if (field === 'weights') matchesThis = p.weight === value;
    else if (field === 'brands') matchesThis = p.brandName === value;
    else if (field === 'terpenes') matchesThis = p.terpenes?.some(tp => tp.name === value) ?? false;

    return stOk && wOk && bOk && tOk && prOk && matchesThis;
  }).length;
}

/** Full product filter (mirrors filteredProducts useMemo) */
function filterProducts(products: Product[], filters: MenuFilters): Product[] {
  const { strainTypes, weights, brands, terpenes, priceRange } = filters;
  return products.filter(p => {
    const matchesStrainType = strainTypes.length === 0 || strainTypes.includes(p.strainType ?? '');
    const matchesWeight = weights.length === 0 || (p.weight != null && weights.includes(p.weight));
    const matchesBrand = brands.length === 0 || brands.includes(p.brandName ?? '');
    const matchesTerpene =
      terpenes.length === 0 ||
      p.terpenes?.some(t => terpenes.includes(t.name)) === true;
    const matchesPrice =
      (priceRange[0] <= 0 || p.price >= priceRange[0]) &&
      (priceRange[1] >= 99999 || p.price <= priceRange[1]);
    return matchesStrainType && matchesWeight && matchesBrand && matchesTerpene && matchesPrice;
  });
}

/** Active filter count (mirrors activeCount in sidebar) */
function countActiveFilters(filters: MenuFilters, priceMin: number, priceMax: number): number {
  return (
    filters.strainTypes.length +
    filters.weights.length +
    filters.brands.length +
    filters.terpenes.length +
    (filters.priceRange[0] > priceMin ||
    (filters.priceRange[1] < priceMax && filters.priceRange[1] < 99999)
      ? 1
      : 0)
  );
}

/** Sentinel resolution for Slider (mirrors effectivePriceRange) */
function effectivePriceRange(
  filters: MenuFilters,
  priceMin: number,
  priceMax: number,
): [number, number] {
  return [
    filters.priceRange[0] <= 0 ? priceMin : filters.priceRange[0],
    filters.priceRange[1] >= 99999 ? priceMax : filters.priceRange[1],
  ];
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const sativa: Product = {
  id: 'p1',
  price: 45,
  strainType: 'Sativa',
  weight: 3.5,
  brandName: 'Elevate',
  terpenes: [
    { name: 'Limonene', percent: 1.2 },
    { name: 'Pinene', percent: 0.8 },
  ],
};

const indica: Product = {
  id: 'p2',
  price: 35,
  strainType: 'Indica',
  weight: 1,
  brandName: 'Chill Co',
  terpenes: [{ name: 'Myrcene', percent: 1.5 }],
};

const hybrid: Product = {
  id: 'p3',
  price: 60,
  strainType: 'Hybrid',
  weight: 7,
  brandName: 'Elevate',
  terpenes: [
    { name: 'Caryophyllene', percent: 0.9 },
    { name: 'Limonene', percent: 0.5 },
  ],
};

const cbdProduct: Product = {
  id: 'p4',
  price: 20,
  strainType: 'CBD',
  weight: 1,
  brandName: 'Green Leaf',
  terpenes: [],
};

const noMetadata: Product = {
  id: 'p5',
  price: 15,
  // no strainType, weight, brandName, terpenes
};

const allProducts = [sativa, indica, hybrid, cbdProduct, noMetadata];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MenuFilters — EMPTY_FILTERS', () => {
  it('has empty arrays for list filters', () => {
    expect(EMPTY_FILTERS.strainTypes).toEqual([]);
    expect(EMPTY_FILTERS.weights).toEqual([]);
    expect(EMPTY_FILTERS.brands).toEqual([]);
    expect(EMPTY_FILTERS.terpenes).toEqual([]);
  });

  it('uses sentinel values for priceRange', () => {
    expect(EMPTY_FILTERS.priceRange[0]).toBe(0);
    expect(EMPTY_FILTERS.priceRange[1]).toBe(99999);
  });

  it('matches all products when applied', () => {
    expect(filterProducts(allProducts, EMPTY_FILTERS)).toHaveLength(allProducts.length);
  });
});

// ─── toggle helper ────────────────────────────────────────────────────────────

describe('toggle helper', () => {
  it('adds a value not in the array', () => {
    expect(toggle(['Sativa'], 'Indica')).toEqual(['Sativa', 'Indica']);
  });

  it('removes a value already in the array', () => {
    expect(toggle(['Sativa', 'Indica'], 'Sativa')).toEqual(['Indica']);
  });

  it('returns empty array when removing the only element', () => {
    expect(toggle(['Sativa'], 'Sativa')).toEqual([]);
  });

  it('works with numbers', () => {
    expect(toggle([1, 3.5], 7)).toEqual([1, 3.5, 7]);
    expect(toggle([1, 3.5, 7], 3.5)).toEqual([1, 7]);
  });

  it('is immutable — does not mutate original array', () => {
    const original = ['Sativa', 'Indica'];
    toggle(original, 'Hybrid');
    expect(original).toEqual(['Sativa', 'Indica']);
  });
});

// ─── strainType filter ────────────────────────────────────────────────────────

describe('filterProducts — strainType', () => {
  it('returns all products when strainTypes is empty', () => {
    const result = filterProducts(allProducts, EMPTY_FILTERS);
    expect(result).toHaveLength(allProducts.length);
  });

  it('filters by a single strainType', () => {
    const filters = { ...EMPTY_FILTERS, strainTypes: ['Sativa'] };
    const result = filterProducts(allProducts, filters);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('filters by multiple strainTypes (OR logic)', () => {
    const filters = { ...EMPTY_FILTERS, strainTypes: ['Sativa', 'Indica'] };
    const result = filterProducts(allProducts, filters);
    expect(result).toHaveLength(2);
    expect(result.map(p => p.id).sort()).toEqual(['p1', 'p2'].sort());
  });

  it('excludes products with no strainType when filtering', () => {
    const filters = { ...EMPTY_FILTERS, strainTypes: ['Hybrid'] };
    const result = filterProducts(allProducts, filters);
    expect(result.find(p => p.id === 'p5')).toBeUndefined();
  });
});

// ─── weight filter ────────────────────────────────────────────────────────────

describe('filterProducts — weight', () => {
  it('returns all when weights is empty', () => {
    expect(filterProducts(allProducts, EMPTY_FILTERS)).toHaveLength(allProducts.length);
  });

  it('filters by a single weight', () => {
    const filters = { ...EMPTY_FILTERS, weights: [3.5] };
    const result = filterProducts(allProducts, filters);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('filters by multiple weights (OR logic)', () => {
    const filters = { ...EMPTY_FILTERS, weights: [1, 7] };
    const result = filterProducts(allProducts, filters);
    // indica (1g), hybrid (7g), cbdProduct (1g)
    expect(result).toHaveLength(3);
    expect(result.map(p => p.id).sort()).toEqual(['p2', 'p3', 'p4'].sort());
  });

  it('excludes products with no weight when filtering', () => {
    const filters = { ...EMPTY_FILTERS, weights: [1] };
    const result = filterProducts(allProducts, filters);
    expect(result.find(p => p.id === 'p5')).toBeUndefined();
  });
});

// ─── brand filter ─────────────────────────────────────────────────────────────

describe('filterProducts — brand', () => {
  it('returns all when brands is empty', () => {
    expect(filterProducts(allProducts, EMPTY_FILTERS)).toHaveLength(allProducts.length);
  });

  it('filters by a single brand', () => {
    const filters = { ...EMPTY_FILTERS, brands: ['Elevate'] };
    const result = filterProducts(allProducts, filters);
    // sativa + hybrid both have brandName Elevate
    expect(result).toHaveLength(2);
    expect(result.map(p => p.id).sort()).toEqual(['p1', 'p3'].sort());
  });

  it('filters by multiple brands (OR logic)', () => {
    const filters = { ...EMPTY_FILTERS, brands: ['Chill Co', 'Green Leaf'] };
    const result = filterProducts(allProducts, filters);
    expect(result).toHaveLength(2);
    expect(result.map(p => p.id).sort()).toEqual(['p2', 'p4'].sort());
  });

  it('excludes products with no brandName when filtering', () => {
    const filters = { ...EMPTY_FILTERS, brands: ['Elevate'] };
    const result = filterProducts(allProducts, filters);
    expect(result.find(p => p.id === 'p5')).toBeUndefined();
  });
});

// ─── terpene filter ───────────────────────────────────────────────────────────

describe('filterProducts — terpenes', () => {
  it('returns all when terpenes is empty', () => {
    expect(filterProducts(allProducts, EMPTY_FILTERS)).toHaveLength(allProducts.length);
  });

  it('filters by a single terpene', () => {
    const filters = { ...EMPTY_FILTERS, terpenes: ['Myrcene'] };
    const result = filterProducts(allProducts, filters);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p2');
  });

  it('matches if product has ANY of the selected terpenes (OR logic)', () => {
    const filters = { ...EMPTY_FILTERS, terpenes: ['Limonene', 'Myrcene'] };
    const result = filterProducts(allProducts, filters);
    // sativa (Limonene), indica (Myrcene), hybrid (Limonene)
    expect(result).toHaveLength(3);
    expect(result.map(p => p.id).sort()).toEqual(['p1', 'p2', 'p3'].sort());
  });

  it('excludes products with empty terpenes array when filtering', () => {
    const filters = { ...EMPTY_FILTERS, terpenes: ['Limonene'] };
    const result = filterProducts(allProducts, filters);
    expect(result.find(p => p.id === 'p4')).toBeUndefined(); // cbdProduct has []
  });

  it('excludes products with no terpenes field when filtering', () => {
    const filters = { ...EMPTY_FILTERS, terpenes: ['Limonene'] };
    const result = filterProducts(allProducts, filters);
    expect(result.find(p => p.id === 'p5')).toBeUndefined();
  });
});

// ─── price range filter ───────────────────────────────────────────────────────

describe('filterProducts — priceRange', () => {
  it('sentinel [0, 99999] matches all products', () => {
    expect(filterProducts(allProducts, EMPTY_FILTERS)).toHaveLength(allProducts.length);
  });

  it('applies lower-bound price filter', () => {
    const filters = { ...EMPTY_FILTERS, priceRange: [40, 99999] as [number, number] };
    const result = filterProducts(allProducts, filters);
    // sativa $45, hybrid $60
    expect(result.map(p => p.id).sort()).toEqual(['p1', 'p3'].sort());
  });

  it('applies upper-bound price filter', () => {
    const filters = { ...EMPTY_FILTERS, priceRange: [0, 30] as [number, number] };
    const result = filterProducts(allProducts, filters);
    // cbdProduct $20, noMetadata $15
    expect(result.map(p => p.id).sort()).toEqual(['p4', 'p5'].sort());
  });

  it('applies both bounds simultaneously', () => {
    const filters = { ...EMPTY_FILTERS, priceRange: [25, 50] as [number, number] };
    const result = filterProducts(allProducts, filters);
    // indica $35, sativa $45
    expect(result.map(p => p.id).sort()).toEqual(['p1', 'p2'].sort());
  });

  it('returns empty when no products in range', () => {
    const filters = { ...EMPTY_FILTERS, priceRange: [200, 500] as [number, number] };
    expect(filterProducts(allProducts, filters)).toHaveLength(0);
  });

  it('includes boundary values (inclusive range)', () => {
    const filters = { ...EMPTY_FILTERS, priceRange: [35, 45] as [number, number] };
    const result = filterProducts(allProducts, filters);
    // indica $35 and sativa $45 are both inclusive boundaries
    expect(result.map(p => p.id).sort()).toEqual(['p1', 'p2'].sort());
  });
});

// ─── Combined (intersection) filters ─────────────────────────────────────────

describe('filterProducts — combined intersection filters', () => {
  it('strainType + brand narrows results correctly', () => {
    const filters = {
      ...EMPTY_FILTERS,
      strainTypes: ['Sativa', 'Hybrid'],
      brands: ['Elevate'],
    };
    const result = filterProducts(allProducts, filters);
    // Both sativa + hybrid are Elevate — both match
    expect(result).toHaveLength(2);
    expect(result.map(p => p.id).sort()).toEqual(['p1', 'p3'].sort());
  });

  it('weight + price narrows results', () => {
    const filters = {
      ...EMPTY_FILTERS,
      weights: [1],
      priceRange: [30, 99999] as [number, number],
    };
    const result = filterProducts(allProducts, filters);
    // 1g products: indica $35 ✓, cbdProduct $20 ✗ (under $30)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p2');
  });

  it('terpene + strainType intersection', () => {
    const filters = {
      ...EMPTY_FILTERS,
      terpenes: ['Limonene'],
      strainTypes: ['Hybrid'],
    };
    const result = filterProducts(allProducts, filters);
    // hybrid has Limonene and is Hybrid → matches
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p3');
  });

  it('all 5 filters simultaneously', () => {
    const filters: MenuFilters = {
      strainTypes: ['Sativa'],
      weights: [3.5],
      brands: ['Elevate'],
      terpenes: ['Limonene'],
      priceRange: [40, 50],
    };
    const result = filterProducts(allProducts, filters);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('returns empty when combined filters have no intersection', () => {
    const filters: MenuFilters = {
      strainTypes: ['Sativa'],
      weights: [7], // Sativa is 3.5g, not 7g
      brands: [],
      terpenes: [],
      priceRange: [0, 99999],
    };
    expect(filterProducts(allProducts, filters)).toHaveLength(0);
  });
});

// ─── countFor — per-option count logic ───────────────────────────────────────

describe('countFor — per-option product counts', () => {
  it('counts all matching products for strainType with no other filters', () => {
    expect(countFor(allProducts, EMPTY_FILTERS, 'strainTypes', 'Sativa')).toBe(1);
    expect(countFor(allProducts, EMPTY_FILTERS, 'strainTypes', 'Indica')).toBe(1);
    expect(countFor(allProducts, EMPTY_FILTERS, 'strainTypes', 'Hybrid')).toBe(1);
  });

  it('counts matching products for weight with no other filters', () => {
    // Both indica + cbdProduct are 1g
    expect(countFor(allProducts, EMPTY_FILTERS, 'weights', 1)).toBe(2);
    expect(countFor(allProducts, EMPTY_FILTERS, 'weights', 3.5)).toBe(1);
    expect(countFor(allProducts, EMPTY_FILTERS, 'weights', 7)).toBe(1);
  });

  it('counts matching products for brand with no other filters', () => {
    expect(countFor(allProducts, EMPTY_FILTERS, 'brands', 'Elevate')).toBe(2);
    expect(countFor(allProducts, EMPTY_FILTERS, 'brands', 'Chill Co')).toBe(1);
  });

  it('counts matching products for terpene with no other filters', () => {
    // Limonene: sativa + hybrid
    expect(countFor(allProducts, EMPTY_FILTERS, 'terpenes', 'Limonene')).toBe(2);
    expect(countFor(allProducts, EMPTY_FILTERS, 'terpenes', 'Myrcene')).toBe(1);
  });

  it('exempts the counted field from other active filters of the same type', () => {
    // countFor intentionally ignores the current strainTypes selection when counting options
    // for strainTypes — this lets users see all available type counts even when one is active.
    // If 'Hybrid' is selected, counting 'Sativa' still returns 1 (the Sativa product exists).
    const filters = { ...EMPTY_FILTERS, strainTypes: ['Hybrid'] };
    expect(countFor(allProducts, filters, 'strainTypes', 'Sativa')).toBe(1);
  });

  it('respects OTHER (cross-field) active filters when counting', () => {
    // countFor applies all filters EXCEPT the field being counted.
    // E.g. if weight=[1] is active, counting strainTypes respects the weight filter.
    const filters = { ...EMPTY_FILTERS, weights: [1] };
    // 1g products: indica (Indica) + cbdProduct (CBD)
    // Sativa product is 3.5g — excluded by weight filter → count = 0
    expect(countFor(allProducts, filters, 'strainTypes', 'Sativa')).toBe(0);
    // Indica product is 1g → count = 1
    expect(countFor(allProducts, filters, 'strainTypes', 'Indica')).toBe(1);
  });

  it('respects price filter when counting brands', () => {
    // With maxPrice $30, only products ≤ $30 shown: cbdProduct $20
    // Elevate has sativa ($45) and hybrid ($60) — both excluded by price
    const filters = { ...EMPTY_FILTERS, priceRange: [0, 30] as [number, number] };
    expect(countFor(allProducts, filters, 'brands', 'Elevate')).toBe(0);
    expect(countFor(allProducts, filters, 'brands', 'Green Leaf')).toBe(1);
  });

  it('does not double-filter on the active field itself', () => {
    // When counting for strainTypes='Sativa', the strainTypes filter should
    // be exempted (we only apply OTHER filters) — so countFor ignores strainTypes
    const filters = { ...EMPTY_FILTERS, strainTypes: ['Indica'] }; // Indica is active
    // Counting for 'Sativa' should not be blocked by the Indica filter
    // (the sidebar exempts the field being counted)
    expect(countFor(allProducts, filters, 'strainTypes', 'Sativa')).toBe(1);
  });

  it('returns 0 for non-existent option value', () => {
    expect(countFor(allProducts, EMPTY_FILTERS, 'strainTypes', 'Purple')).toBe(0);
    expect(countFor(allProducts, EMPTY_FILTERS, 'brands', 'Unknown Brand')).toBe(0);
    expect(countFor(allProducts, EMPTY_FILTERS, 'terpenes', 'Fakerpene')).toBe(0);
  });
});

// ─── Active filter count ──────────────────────────────────────────────────────

describe('countActiveFilters', () => {
  const priceMin = 15;
  const priceMax = 60;

  it('returns 0 for EMPTY_FILTERS', () => {
    expect(countActiveFilters(EMPTY_FILTERS, priceMin, priceMax)).toBe(0);
  });

  it('counts each selected strainType', () => {
    const filters = { ...EMPTY_FILTERS, strainTypes: ['Sativa', 'Indica'] };
    expect(countActiveFilters(filters, priceMin, priceMax)).toBe(2);
  });

  it('counts each selected weight', () => {
    const filters = { ...EMPTY_FILTERS, weights: [1, 3.5, 7] };
    expect(countActiveFilters(filters, priceMin, priceMax)).toBe(3);
  });

  it('counts each selected brand', () => {
    const filters = { ...EMPTY_FILTERS, brands: ['Elevate'] };
    expect(countActiveFilters(filters, priceMin, priceMax)).toBe(1);
  });

  it('counts each selected terpene', () => {
    const filters = { ...EMPTY_FILTERS, terpenes: ['Myrcene', 'Limonene'] };
    expect(countActiveFilters(filters, priceMin, priceMax)).toBe(2);
  });

  it('counts price range as 1 when min is above product minimum', () => {
    const filters = { ...EMPTY_FILTERS, priceRange: [25, 99999] as [number, number] };
    expect(countActiveFilters(filters, priceMin, priceMax)).toBe(1);
  });

  it('counts price range as 1 when max is below product maximum', () => {
    const filters = { ...EMPTY_FILTERS, priceRange: [0, 50] as [number, number] };
    expect(countActiveFilters(filters, priceMin, priceMax)).toBe(1);
  });

  it('does not count price when at sentinel values', () => {
    const filters = { ...EMPTY_FILTERS, priceRange: [0, 99999] as [number, number] };
    expect(countActiveFilters(filters, priceMin, priceMax)).toBe(0);
  });

  it('counts all filter types together', () => {
    const filters: MenuFilters = {
      strainTypes: ['Sativa'],       // +1
      weights: [1, 3.5],             // +2
      brands: ['Elevate'],            // +1
      terpenes: ['Limonene'],         // +1
      priceRange: [20, 55],           // +1
    };
    expect(countActiveFilters(filters, priceMin, priceMax)).toBe(6);
  });
});

// ─── effectivePriceRange (sentinel resolution) ────────────────────────────────

describe('effectivePriceRange — sentinel resolution', () => {
  const priceMin = 10;
  const priceMax = 80;

  it('resolves 0 sentinel to priceMin', () => {
    const [lo] = effectivePriceRange(EMPTY_FILTERS, priceMin, priceMax);
    expect(lo).toBe(priceMin);
  });

  it('resolves 99999 sentinel to priceMax', () => {
    const [, hi] = effectivePriceRange(EMPTY_FILTERS, priceMin, priceMax);
    expect(hi).toBe(priceMax);
  });

  it('preserves explicit user-set min', () => {
    const filters = { ...EMPTY_FILTERS, priceRange: [25, 99999] as [number, number] };
    const [lo] = effectivePriceRange(filters, priceMin, priceMax);
    expect(lo).toBe(25);
  });

  it('preserves explicit user-set max', () => {
    const filters = { ...EMPTY_FILTERS, priceRange: [0, 55] as [number, number] };
    const [, hi] = effectivePriceRange(filters, priceMin, priceMax);
    expect(hi).toBe(55);
  });

  it('preserves both user-set bounds', () => {
    const filters = { ...EMPTY_FILTERS, priceRange: [20, 60] as [number, number] };
    const [lo, hi] = effectivePriceRange(filters, priceMin, priceMax);
    expect(lo).toBe(20);
    expect(hi).toBe(60);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('handles empty products array gracefully', () => {
    expect(filterProducts([], EMPTY_FILTERS)).toHaveLength(0);
    expect(filterProducts([], { ...EMPTY_FILTERS, strainTypes: ['Sativa'] })).toHaveLength(0);
    expect(countFor([], EMPTY_FILTERS, 'strainTypes', 'Sativa')).toBe(0);
  });

  it('handles product with no optional fields', () => {
    const bare: Product = { id: 'bare', price: 25 };
    const result = filterProducts([bare], EMPTY_FILTERS);
    expect(result).toHaveLength(1); // matches everything with no filters
  });

  it('does not include product with missing field when that field is filtered', () => {
    const bare: Product = { id: 'bare', price: 25 };
    expect(filterProducts([bare], { ...EMPTY_FILTERS, strainTypes: ['Sativa'] })).toHaveLength(0);
    expect(filterProducts([bare], { ...EMPTY_FILTERS, weights: [3.5] })).toHaveLength(0);
    expect(filterProducts([bare], { ...EMPTY_FILTERS, brands: ['Elevate'] })).toHaveLength(0);
    expect(filterProducts([bare], { ...EMPTY_FILTERS, terpenes: ['Myrcene'] })).toHaveLength(0);
  });

  it('products with empty terpenes array do not match terpene filter', () => {
    const noTerpenes: Product = { id: 'nt', price: 30, terpenes: [] };
    expect(
      filterProducts([noTerpenes], { ...EMPTY_FILTERS, terpenes: ['Limonene'] }),
    ).toHaveLength(0);
  });

  it('handles exact price boundary at priceMin', () => {
    const product: Product = { id: 'boundary', price: 20 };
    const filters = { ...EMPTY_FILTERS, priceRange: [20, 99999] as [number, number] };
    expect(filterProducts([product], filters)).toHaveLength(1);
  });

  it('handles exact price boundary at priceMax', () => {
    const product: Product = { id: 'boundary', price: 60 };
    const filters = { ...EMPTY_FILTERS, priceRange: [0, 60] as [number, number] };
    expect(filterProducts([product], filters)).toHaveLength(1);
  });

  it('toggle on empty array adds the value', () => {
    expect(toggle([], 'Sativa')).toEqual(['Sativa']);
  });

  it('toggling same value twice returns empty array', () => {
    const arr = toggle(toggle([], 'Sativa'), 'Sativa');
    expect(arr).toEqual([]);
  });

  it('priceRange lower sentinel (0) allows products at any price', () => {
    const cheap: Product = { id: 'cheap', price: 0.01 };
    expect(filterProducts([cheap], EMPTY_FILTERS)).toHaveLength(1);
  });
});

// ─── URL param sync logic ─────────────────────────────────────────────────────

describe('URL param sync logic', () => {
  /**
   * Mirrors the parsing done in brand-menu-client / dispensary-menu-client
   * when building sidebarFilters from URL search params.
   */
  function parseFiltersFromUrl(params: Record<string, string>): MenuFilters {
    const urlStrainTypes = params['types']?.split(',').filter(Boolean) ?? [];
    const urlWeights = params['weights']?.split(',').map(Number).filter(n => !isNaN(n)) ?? [];
    const urlBrands = params['brands']?.split(',').filter(Boolean).map(decodeURIComponent) ?? [];
    const urlTerpenes = params['terpenes']?.split(',').filter(Boolean) ?? [];
    const urlMinPrice = Number(params['minPrice']) || 0;
    const urlMaxPrice = Number(params['maxPrice']) || 99999;
    return {
      strainTypes: urlStrainTypes,
      weights: urlWeights,
      brands: urlBrands,
      terpenes: urlTerpenes,
      priceRange: [urlMinPrice, urlMaxPrice],
    };
  }

  function serializeFiltersToUrl(filters: MenuFilters): Record<string, string | null> {
    return {
      types: filters.strainTypes.join(',') || null,
      weights: filters.weights.join(',') || null,
      brands: filters.brands.map(encodeURIComponent).join(',') || null,
      terpenes: filters.terpenes.join(',') || null,
      minPrice: filters.priceRange[0] > 0 ? String(filters.priceRange[0]) : null,
      maxPrice: filters.priceRange[1] < 99999 ? String(filters.priceRange[1]) : null,
    };
  }

  it('parses empty URL params to EMPTY_FILTERS', () => {
    const parsed = parseFiltersFromUrl({});
    expect(parsed).toEqual(EMPTY_FILTERS);
  });

  it('parses strainTypes from URL', () => {
    const parsed = parseFiltersFromUrl({ types: 'Sativa,Indica' });
    expect(parsed.strainTypes).toEqual(['Sativa', 'Indica']);
  });

  it('parses weights from URL (numeric)', () => {
    const parsed = parseFiltersFromUrl({ weights: '1,3.5,7' });
    expect(parsed.weights).toEqual([1, 3.5, 7]);
  });

  it('parses brands from URL (URL-decoded)', () => {
    const encoded = encodeURIComponent('Chill Co');
    const parsed = parseFiltersFromUrl({ brands: encoded });
    expect(parsed.brands).toEqual(['Chill Co']);
  });

  it('parses terpenes from URL', () => {
    const parsed = parseFiltersFromUrl({ terpenes: 'Myrcene,Limonene' });
    expect(parsed.terpenes).toEqual(['Myrcene', 'Limonene']);
  });

  it('parses price bounds from URL', () => {
    const parsed = parseFiltersFromUrl({ minPrice: '20', maxPrice: '55' });
    expect(parsed.priceRange).toEqual([20, 55]);
  });

  it('uses sentinels when price params absent', () => {
    const parsed = parseFiltersFromUrl({});
    expect(parsed.priceRange).toEqual([0, 99999]);
  });

  it('serializes empty filters to all nulls (clears URL params)', () => {
    const serialized = serializeFiltersToUrl(EMPTY_FILTERS);
    expect(serialized.types).toBeNull();
    expect(serialized.weights).toBeNull();
    expect(serialized.brands).toBeNull();
    expect(serialized.terpenes).toBeNull();
    expect(serialized.minPrice).toBeNull();
    expect(serialized.maxPrice).toBeNull();
  });

  it('serializes active filters to URL strings', () => {
    const filters: MenuFilters = {
      strainTypes: ['Sativa', 'Hybrid'],
      weights: [3.5],
      brands: ['Elevate'],
      terpenes: ['Limonene'],
      priceRange: [30, 60],
    };
    const serialized = serializeFiltersToUrl(filters);
    expect(serialized.types).toBe('Sativa,Hybrid');
    expect(serialized.weights).toBe('3.5');
    expect(serialized.terpenes).toBe('Limonene');
    expect(serialized.minPrice).toBe('30');
    expect(serialized.maxPrice).toBe('60');
  });

  it('URL round-trip: serialize → parse returns same filters', () => {
    const original: MenuFilters = {
      strainTypes: ['Indica'],
      weights: [1, 7],
      brands: ['Chill Co'],
      terpenes: ['Myrcene'],
      priceRange: [20, 50],
    };
    const serialized = serializeFiltersToUrl(original);
    // Convert null → omit, string → include
    const urlParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(serialized)) {
      if (v !== null) urlParams[k] = v;
    }
    const parsed = parseFiltersFromUrl(urlParams);
    expect(parsed.strainTypes).toEqual(original.strainTypes);
    expect(parsed.weights).toEqual(original.weights);
    expect(parsed.terpenes).toEqual(original.terpenes);
    expect(parsed.priceRange).toEqual(original.priceRange);
  });
});
