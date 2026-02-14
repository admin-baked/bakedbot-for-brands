'use client';

/**
 * Brand Search Input Component
 * Autocomplete input that searches CannMenus brands API
 */

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Check } from 'lucide-react';
import { searchBrandsAction } from '../actions/data-actions';

type Brand = {
    id: string;
    name: string;
};

interface BrandSearchInputProps {
    value: Brand | null;
    onChange: (brand: Brand | null) => void;
    label?: string;
    placeholder?: string;
    required?: boolean;
}

export function BrandSearchInput({
    value,
    onChange,
    label = 'Brand Name',
    placeholder = 'Search for a brand (e.g., Jeeter, Stiiizy)...',
    required = false
}: BrandSearchInputProps) {
    const [query, setQuery] = useState(value?.name || '');
    const [results, setResults] = useState<Brand[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout>();

    // Handle search with debounce
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (query.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        // Don't search if the query matches the selected value
        if (value && query === value.name) {
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                const brands = await searchBrandsAction(query);
                setResults(brands);
                setIsOpen(brands.length > 0);
            } catch (error) {
                console.error('Brand search error:', error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query, value]);

    // Handle click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (brand: Brand) => {
        setQuery(brand.name);
        onChange(brand);
        setIsOpen(false);
        setResults([]);
    };

    const handleClear = () => {
        setQuery('');
        onChange(null);
        setResults([]);
    };

    return (
        <div className="space-y-2" ref={containerRef}>
            <Label htmlFor="brand-search">
                {label} {required && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="brand-search"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (value && e.target.value !== value.name) {
                                onChange(null); // Clear selection if user types something different
                            }
                        }}
                        onFocus={() => {
                            if (results.length > 0) setIsOpen(true);
                        }}
                        placeholder={placeholder}
                        className="pl-9 pr-10"
                        autoComplete="off"
                    />
                    {isLoading && (
                        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {value && !isLoading && (
                        <Check className="absolute right-3 top-2.5 h-4 w-4 text-green-500" />
                    )}
                </div>

                {/* Results Dropdown */}
                {isOpen && results.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {results.map((brand) => (
                            <button
                                key={brand.id}
                                type="button"
                                className="w-full text-left px-4 py-3 hover:bg-muted/50 text-sm flex justify-between items-center border-b last:border-0 transition-colors"
                                onClick={() => handleSelect(brand)}
                            >
                                <span className="font-medium">{brand.name}</span>
                                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                                    ID: {brand.id}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {value && (
                <p className="text-xs text-muted-foreground">
                    Selected: <strong>{value.name}</strong> (ID: {value.id})
                    <button
                        type="button"
                        onClick={handleClear}
                        className="ml-2 text-destructive hover:underline"
                    >
                        Clear
                    </button>
                </p>
            )}
        </div>
    );
}
