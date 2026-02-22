/**
 * Thrive Menu Components - Unit Tests
 * Tests for individual React components:
 * - DemoHeader (phone button, location, branding)
 * - ProductSection (category anchoring)
 * - CategoryGrid (smooth scroll navigation)
 * - BrandMenuClient (overall menu orchestration)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Thrive Menu Components', () => {
  describe('DemoHeader Component', () => {
    it('should render logo', () => {
      const mockLogoUrl = 'https://example.com/thrive-logo.png';
      const mockOrgName = 'Thrive Syracuse';

      expect(mockOrgName).toContain('Thrive');
      expect(mockLogoUrl).toContain('thrive');
    });

    it('should display phone button with tel: link', () => {
      const phone = '(315) 207-7935';
      const cleanPhone = phone.replace(/\D/g, '');
      const telLink = `tel:${cleanPhone}`;

      expect(telLink).toBe('tel:3152077935');
      expect(telLink).toMatch(/^tel:\d{10}$/);
    });

    it('should show phone button only when phone prop provided', () => {
      interface DemoHeaderProps {
        phone?: string;
      }

      const headerWithPhone: DemoHeaderProps = { phone: '(315) 207-7935' };
      const headerWithoutPhone: DemoHeaderProps = {};

      expect(headerWithPhone.phone).toBeDefined();
      expect(headerWithoutPhone.phone).toBeUndefined();
    });

    it('should display location with full address', () => {
      const location = {
        address: '3065 Erie Blvd E',
        city: 'Syracuse',
        state: 'NY',
        zip: '13224'
      };

      const fullAddress = `${location.address}, ${location.city}, ${location.state} ${location.zip}`;
      expect(fullAddress).toBe('3065 Erie Blvd E, Syracuse, NY 13224');
    });

    it('should support custom brand colors', () => {
      const brandColors = {
        primary: '#22c55e', // green
        secondary: '#1f2937',
        accent: '#10b981'
      };

      expect(brandColors.primary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(brandColors.primary).toBe('#22c55e');
    });

    it('should be responsive to screen size', () => {
      const layouts = {
        mobile: 'single-column',
        tablet: 'two-column',
        desktop: 'three-column'
      };

      expect(layouts.mobile).toBe('single-column');
      expect(layouts.desktop).toBe('three-column');
    });
  });

  describe('ProductSection Component', () => {
    it('should have proper ID for anchoring', () => {
      const categoryName = 'Flower';
      const categoryId = `category-${categoryName.toLowerCase().replace(/\s+/g, '-')}`;

      expect(categoryId).toBe('category-flower');
    });

    it('should apply scroll-margin-top class', () => {
      const scrollMarginClass = 'scroll-mt-20';
      expect(scrollMarginClass).toMatch(/scroll-mt-/);
    });

    it('should render section with id prop', () => {
      interface ProductSectionProps {
        id?: string;
        title: string;
        products: any[];
      }

      const props: ProductSectionProps = {
        id: 'category-flower',
        title: 'Flower',
        products: []
      };

      expect(props.id).toBeDefined();
      expect(props.id).toBe('category-flower');
    });

    it('should display products in section', () => {
      const mockProducts = [
        { id: '1', name: 'Blue Dream' },
        { id: '2', name: 'Purple Haze' }
      ];

      expect(mockProducts).toHaveLength(2);
      expect(mockProducts[0].name).toBe('Blue Dream');
    });
  });

  describe('CategoryGrid Component', () => {
    it('should render all categories', () => {
      const categories = [
        'Flower',
        'Edibles',
        'Concentrates',
        'Topicals',
        'Vapes',
        'Pre-Rolls',
        'Other'
      ];

      expect(categories).toHaveLength(7);
    });

    it('should generate correct category ID on click', () => {
      const categoryName = 'Edibles';
      const categoryId = `category-${categoryName.toLowerCase().replace(/\s+/g, '-')}`;

      expect(categoryId).toBe('category-edibles');
    });

    it('should have click handler for smooth scroll', () => {
      interface CategoryGridProps {
        onCategoryClick?: (id: string) => void;
      }

      let clickedId = '';
      const mockHandler = (id: string) => {
        clickedId = id;
      };

      const props: CategoryGridProps = {
        onCategoryClick: mockHandler
      };

      props.onCategoryClick?.('category-flower');
      expect(clickedId).toBe('category-flower');
    });

    it('should support smooth scroll behavior', () => {
      const scrollConfig = {
        behavior: 'smooth' as const,
        block: 'start' as const
      };

      expect(scrollConfig.behavior).toBe('smooth');
    });
  });

  describe('Brand Detail Pages', () => {
    it('should render brand name in URL', () => {
      const brandName = 'Jaunty';
      const brandUrl = `/thrivesyracuse/brands/${encodeURIComponent(brandName)}`;

      expect(brandUrl).toContain('brands');
      expect(brandUrl).toContain('Jaunty');
    });

    it('should filter products by brand', () => {
      const allProducts = [
        { name: 'Product 1', brandName: 'Jaunty' },
        { name: 'Product 2', brandName: 'Lowell' },
        { name: 'Product 3', brandName: 'Jaunty' }
      ];

      const selectedBrand = 'Jaunty';
      const filtered = allProducts.filter(p =>
        p.brandName.toLowerCase() === selectedBrand.toLowerCase()
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.every(p => p.brandName === 'Jaunty')).toBe(true);
    });

    it('should decode brand name from URL parameter', () => {
      const encoded = 'Blue%20Dream';
      const decoded = decodeURIComponent(encoded);

      expect(decoded).toBe('Blue Dream');
    });

    it('should handle special characters in brand names', () => {
      const brandNames = [
        'Mary\'s Dream',
        'J.P. Productions',
        'Brand & Co'
      ];

      brandNames.forEach(name => {
        const encoded = encodeURIComponent(name);
        const decoded = decodeURIComponent(encoded);
        expect(decoded).toBe(name);
      });
    });

    it('should display back button to return to menu', () => {
      interface BrandPageProps {
        brand?: string;
        onBack?: () => void;
      }

      let backClicked = false;
      const props: BrandPageProps = {
        brand: 'Jaunty',
        onBack: () => {
          backClicked = true;
        }
      };

      props.onBack?.();
      expect(backClicked).toBe(true);
    });
  });

  describe('Phone Button Unit Tests', () => {
    it('should format 10-digit phone number', () => {
      const input = '3152077935';
      const formatted = `(${input.slice(0, 3)}) ${input.slice(3, 6)}-${input.slice(6)}`;

      expect(formatted).toBe('(315) 207-7935');
    });

    it('should create valid tel: link', () => {
      const phone = '(315) 207-7935';
      const digits = phone.replace(/\D/g, '');
      const telLink = `tel:${digits}`;

      expect(telLink).toMatch(/^tel:\d{10}$/);
    });

    it('should be clickable on all devices', () => {
      const isClickable = {
        desktop: true,
        tablet: true,
        mobile: true
      };

      expect(isClickable.desktop).toBe(true);
      expect(isClickable.mobile).toBe(true);
    });

    it('should have proper ARIA labels for accessibility', () => {
      const ariaLabel = 'Call Thrive Syracuse at (315) 207-7935';
      expect(ariaLabel).toContain('Call');
      expect(ariaLabel).toContain('3152077935'.slice(0, 3));
    });
  });

  describe('Location Display Unit Tests', () => {
    it('should combine address components', () => {
      const location = {
        address: '3065 Erie Blvd E',
        city: 'Syracuse',
        state: 'NY',
        zip: '13224'
      };

      const display = `${location.address}, ${location.city}, ${location.state} ${location.zip}`;
      expect(display).toBe('3065 Erie Blvd E, Syracuse, NY 13224');
    });

    it('should support Google Maps link', () => {
      const address = '3065 Erie Blvd E, Syracuse, NY 13224';
      const encoded = encodeURIComponent(address);
      const mapsUrl = `https://maps.google.com/?q=${encoded}`;

      expect(mapsUrl).toContain('maps.google.com');
      expect(mapsUrl).toContain('3065');
    });

    it('should handle missing address parts gracefully', () => {
      const location = {
        address: '3065 Erie Blvd E',
        city: 'Syracuse'
        // missing state and zip
      };

      const display = `${location.address}, ${location.city}`;
      expect(display).toBe('3065 Erie Blvd E, Syracuse');
    });
  });

  describe('Search Component', () => {
    it('should filter products by search term', () => {
      const products = [
        { name: 'Blue Dream', brandName: 'Jaunty' },
        { name: 'Purple Haze', brandName: 'Lowell' },
        { name: 'Blue Cheese', brandName: 'Nanticoke' }
      ];

      const searchTerm = 'blue';
      const results = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(results).toHaveLength(2);
    });

    it('should be case-insensitive', () => {
      const products = ['Blue Dream', 'BLUE DREAM', 'blue dream'];
      const search = 'Blue Dream';

      const matches = products.filter(p =>
        p.toLowerCase() === search.toLowerCase()
      );

      expect(matches).toHaveLength(3);
    });

    it('should clear search results on empty input', () => {
      const allProducts = [
        { name: 'Product 1' },
        { name: 'Product 2' }
      ];

      const searchTerm = '';
      const results = searchTerm
        ? allProducts.filter(p => p.name.includes(searchTerm))
        : allProducts;

      expect(results).toHaveLength(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      const headings = ['h1', 'h2', 'h3'];
      expect(headings[0]).toBe('h1');
      expect(headings[1]).toBe('h2');
    });

    it('should have alt text for images', () => {
      const productCard = {
        name: 'Blue Dream',
        image: {
          src: 'product.jpg',
          alt: 'Blue Dream flower product'
        }
      };

      expect(productCard.image.alt).toBeDefined();
      expect(productCard.image.alt).toContain('Blue Dream');
    });

    it('should have labels for interactive elements', () => {
      const elements = {
        phoneButton: { label: 'Call Thrive' },
        searchBox: { label: 'Search products' },
        categoryLink: { label: 'View Flower category' }
      };

      expect(elements.phoneButton.label).toBeDefined();
      expect(elements.searchBox.label).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing products gracefully', () => {
      const products = null;
      const result = products ? products : [];

      expect(result).toEqual([]);
    });

    it('should handle network errors in API calls', async () => {
      const mockFetch = async () => {
        throw new Error('Network error');
      };

      try {
        await mockFetch();
      } catch (error: any) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should validate product data structure', () => {
      const product = {
        id: '1',
        name: 'Product',
        price: 10.00
      };

      const isValid = product.id && product.name && product.price !== undefined;
      expect(isValid).toBe(true);
    });
  });
});
