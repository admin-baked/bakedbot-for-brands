'use client';

/**
 * MenuFilterSidebar — Advanced product filters for public menu pages.
 *
 * Renders collapsible sections for:
 *   Types (strainType), Weights, Brands, Terpenes, Price Range
 *
 * Each option shows a live count of matching products.
 * Supports both desktop sticky sidebar and mobile Sheet drawer.
 */

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/domain';

export type MenuFilters = {
  strainTypes: string[];
  weights: number[];
  brands: string[];
  terpenes: string[];
  /** [min, max] — use 0 / 99999 as "no filter" sentinels */
  priceRange: [number, number];
};

export const EMPTY_FILTERS: MenuFilters = {
  strainTypes: [],
  weights: [],
  brands: [],
  terpenes: [],
  priceRange: [0, 99999],
};

interface MenuFilterSidebarProps {
  products: Product[];
  filters: MenuFilters;
  onChange: (f: MenuFilters) => void;
  primaryColor?: string;
  className?: string;
}

export function MenuFilterSidebar({
  products,
  filters,
  onChange,
  primaryColor = '#16a34a',
  className,
}: MenuFilterSidebarProps) {
  const [brandSearch, setBrandSearch] = useState('');
  const [terpeneSearch, setTerpeneSearch] = useState('');
  const [showMoreBrands, setShowMoreBrands] = useState(false);
  const [showMoreTerpenes, setShowMoreTerpenes] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    types: true,
    weights: true,
    brands: true,
    terpenes: false,
    price: true,
  });

  // ─── Derived option lists ────────────────────────────────────────────────

  const allStrainTypes = useMemo(() => {
    const s = new Set<string>();
    products.forEach(p => { if (p.strainType) s.add(p.strainType); });
    return [...s].sort();
  }, [products]);

  const allWeights = useMemo(() => {
    const s = new Set<number>();
    products.forEach(p => { if (p.weight != null) s.add(p.weight); });
    return [...s].sort((a, b) => a - b);
  }, [products]);

  const allBrands = useMemo(() => {
    const s = new Set<string>();
    products.forEach(p => { if (p.brandName) s.add(p.brandName); });
    return [...s].sort();
  }, [products]);

  const allTerpenes = useMemo(() => {
    const s = new Set<string>();
    products.forEach(p => p.terpenes?.forEach(t => s.add(t.name)));
    return [...s].sort();
  }, [products]);

  const priceMin = useMemo(
    () => (products.length > 0 ? Math.floor(Math.min(...products.map(p => p.price))) : 0),
    [products],
  );
  const priceMax = useMemo(
    () => (products.length > 0 ? Math.ceil(Math.max(...products.map(p => p.price))) : 999),
    [products],
  );

  // ─── Active filter count ─────────────────────────────────────────────────

  const activeCount =
    filters.strainTypes.length +
    filters.weights.length +
    filters.brands.length +
    filters.terpenes.length +
    (filters.priceRange[0] > priceMin || (filters.priceRange[1] < priceMax && filters.priceRange[1] < 99999) ? 1 : 0);

  // ─── Per-option product counts (honours other active filters) ────────────

  const countFor = (field: keyof MenuFilters, value: string | number): number =>
    products.filter(p => {
      const stOk =
        field === 'strainTypes' || filters.strainTypes.length === 0 || filters.strainTypes.includes(p.strainType ?? '');
      const wOk =
        field === 'weights' || filters.weights.length === 0 || (p.weight != null && filters.weights.includes(p.weight));
      const bOk =
        field === 'brands' || filters.brands.length === 0 || filters.brands.includes(p.brandName ?? '');
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

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const toggleSection = (id: string) =>
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));

  const toggle = <T extends string | number>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const clearAll = () => onChange({ ...EMPTY_FILTERS, priceRange: [priceMin, priceMax] });

  const formatWeight = (w: number) => (w < 1 ? `${w}g` : `${w}g`);

  // Resolve "no-filter" sentinel values to actual product price bounds for the slider
  const effectivePriceRange: [number, number] = [
    filters.priceRange[0] <= 0 ? priceMin : filters.priceRange[0],
    filters.priceRange[1] >= 99999 ? priceMax : filters.priceRange[1],
  ];

  // ─── Sub-components ──────────────────────────────────────────────────────

  const SectionHeader = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center justify-between w-full py-2 text-xs font-bold uppercase tracking-wider text-foreground hover:text-primary transition-colors"
    >
      <span>{label}</span>
      {openSections[id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    </button>
  );

  const CheckboxItem = ({
    checked,
    onToggle,
    label,
    count,
  }: {
    checked: boolean;
    onToggle: () => void;
    label: string;
    count: number;
  }) => (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="rounded h-3.5 w-3.5 shrink-0"
        style={{ accentColor: primaryColor }}
      />
      <span
        className={cn(
          'text-sm flex-1 truncate leading-snug transition-colors',
          checked
            ? 'font-medium text-foreground'
            : 'text-muted-foreground group-hover:text-foreground',
        )}
      >
        {label}
      </span>
      <span className="text-xs text-muted-foreground shrink-0">({count})</span>
    </label>
  );

  const filteredBrands = brandSearch
    ? allBrands.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()))
    : allBrands;

  const filteredTerpenes = terpeneSearch
    ? allTerpenes.filter(t => t.toLowerCase().includes(terpeneSearch.toLowerCase()))
    : allTerpenes;

  const visibleBrands = showMoreBrands ? filteredBrands : filteredBrands.slice(0, 6);
  const visibleTerpenes = showMoreTerpenes ? filteredTerpenes : filteredTerpenes.slice(0, 6);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={cn('text-sm', className)}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-xs uppercase tracking-wider">Filters</span>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear ({activeCount})
          </button>
        )}
      </div>

      <div className="divide-y divide-border">
        {/* ── TYPES ──────────────────────────────────────────────────────── */}
        {allStrainTypes.length > 0 && (
          <div className="py-3 first:pt-0">
            <SectionHeader id="types" label="Types" />
            {openSections.types && (
              <div className="mt-2 space-y-2">
                {allStrainTypes.map(type => (
                  <CheckboxItem
                    key={type}
                    checked={filters.strainTypes.includes(type)}
                    onToggle={() =>
                      onChange({ ...filters, strainTypes: toggle(filters.strainTypes, type) })
                    }
                    label={type}
                    count={countFor('strainTypes', type)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WEIGHTS ────────────────────────────────────────────────────── */}
        {allWeights.length > 0 && (
          <div className="py-3">
            <SectionHeader id="weights" label="Weights" />
            {openSections.weights && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {allWeights.map(w => {
                  const active = filters.weights.includes(w);
                  return (
                    <button
                      key={w}
                      onClick={() =>
                        onChange({ ...filters, weights: toggle(filters.weights, w) })
                      }
                      className={cn(
                        'px-2.5 py-1 rounded text-xs font-medium border transition-all',
                        active
                          ? 'text-white border-transparent'
                          : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground',
                      )}
                      style={
                        active
                          ? { backgroundColor: primaryColor, borderColor: primaryColor }
                          : undefined
                      }
                    >
                      {formatWeight(w)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── BRANDS ─────────────────────────────────────────────────────── */}
        {allBrands.length > 0 && (
          <div className="py-3">
            <SectionHeader id="brands" label="Brands" />
            {openSections.brands && (
              <>
                {allBrands.length > 4 && (
                  <div className="relative mt-1 mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search Brands..."
                      value={brandSearch}
                      onChange={e => setBrandSearch(e.target.value)}
                      className="pl-6 h-7 text-xs"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  {visibleBrands.map(brand => (
                    <CheckboxItem
                      key={brand}
                      checked={filters.brands.includes(brand)}
                      onToggle={() =>
                        onChange({ ...filters, brands: toggle(filters.brands, brand) })
                      }
                      label={brand}
                      count={countFor('brands', brand)}
                    />
                  ))}
                </div>
                {filteredBrands.length > 6 && (
                  <button
                    onClick={() => setShowMoreBrands(!showMoreBrands)}
                    className="mt-2 text-xs font-medium hover:underline"
                    style={{ color: primaryColor }}
                  >
                    {showMoreBrands
                      ? 'Show Less'
                      : `View More (${filteredBrands.length - 6} more)`}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TERPENES ───────────────────────────────────────────────────── */}
        {allTerpenes.length > 0 && (
          <div className="py-3">
            <SectionHeader id="terpenes" label="Terpenes" />
            {openSections.terpenes && (
              <>
                {allTerpenes.length > 4 && (
                  <div className="relative mt-1 mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search Terpenes..."
                      value={terpeneSearch}
                      onChange={e => setTerpeneSearch(e.target.value)}
                      className="pl-6 h-7 text-xs"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  {visibleTerpenes.map(terpene => (
                    <CheckboxItem
                      key={terpene}
                      checked={filters.terpenes.includes(terpene)}
                      onToggle={() =>
                        onChange({ ...filters, terpenes: toggle(filters.terpenes, terpene) })
                      }
                      label={terpene}
                      count={countFor('terpenes', terpene)}
                    />
                  ))}
                </div>
                {filteredTerpenes.length > 6 && (
                  <button
                    onClick={() => setShowMoreTerpenes(!showMoreTerpenes)}
                    className="mt-2 text-xs font-medium hover:underline"
                    style={{ color: primaryColor }}
                  >
                    {showMoreTerpenes
                      ? 'Show Less'
                      : `View More (${filteredTerpenes.length - 6} more)`}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── PRICE RANGE ────────────────────────────────────────────────── */}
        {priceMax > priceMin && (
          <div className="py-3">
            <SectionHeader id="price" label="Price Range" />
            {openSections.price && (
              <div className="mt-3 px-1">
                <Slider
                  min={priceMin}
                  max={priceMax}
                  step={1}
                  value={effectivePriceRange}
                  onValueChange={v =>
                    onChange({ ...filters, priceRange: v as [number, number] })
                  }
                />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>${effectivePriceRange[0]}</span>
                  <span>${effectivePriceRange[1]}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
