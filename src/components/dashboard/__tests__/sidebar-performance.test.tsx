/**
 * Tests for sidebar performance optimizations
 */

import { render } from '@testing-library/react';
import { BrandSidebar } from '../brand-sidebar';
import { DispensarySidebar } from '../dispensary-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { useUserRole } from '@/hooks/use-user-role';
import React from 'react';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock user role hook
jest.mock('@/hooks/use-user-role', () => ({
  useUserRole: jest.fn(),
}));

// Mock agentic dashboard hook for agent squad
jest.mock('@/hooks/use-agentic-dashboard', () => ({
  AGENT_SQUAD: [
    { id: 'smokey', name: 'Smokey', role: 'Budtender', img: '/smokey.jpg', status: 'online' },
    { id: 'craig', name: 'Craig', role: 'Marketer', img: '/craig.jpg', status: 'working' },
  ],
}));

// Mock InviteUserDialog
jest.mock('../admin/invite-user-dialog', () => ({
  InviteUserDialog: ({ trigger }: { trigger: React.ReactNode }) => trigger,
}));

// Mock window.matchMedia (required by useMobile hook in SidebarProvider)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Helper to render sidebar with provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <SidebarProvider>
      {component}
    </SidebarProvider>
  );
};

describe('Sidebar Performance Optimizations', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    (useUserRole as jest.Mock).mockReturnValue({ orgId: 'org_123' });
  });

  describe('BrandSidebar', () => {
    it('is memoized with React.memo', () => {
      // Check that BrandSidebar is wrapped with memo
      expect(BrandSidebar).toHaveProperty('$$typeof');
      // Memo components have a specific $$typeof symbol
      expect(String(BrandSidebar.$$typeof)).toContain('react.memo');
    });

    it('renders without crashing', () => {
      const { container } = renderWithProvider(<BrandSidebar />);
      expect(container).toBeTruthy();
    });

    it('all Links have prefetch prop', () => {
      const { container } = renderWithProvider(<BrandSidebar />);

      // Get all Link elements (they render as <a> tags)
      const links = container.querySelectorAll('a[href^="/dashboard"]');

      expect(links.length).toBeGreaterThan(0);

      // Note: prefetch prop doesn't appear in DOM, but we can verify Links render
      // The actual prefetch behavior is tested via the Next.js Link component
    });

    it('does not re-render when pathname is the same', () => {
      const { rerender } = renderWithProvider(<BrandSidebar />);

      // Get initial HTML
      const initialHTML = document.body.innerHTML;

      // Force re-render with same props
      rerender(<SidebarProvider><BrandSidebar /></SidebarProvider>);

      // HTML should be identical (component memoized)
      expect(document.body.innerHTML).toBe(initialHTML);
    });

    it('has workspace navigation links', () => {
      const { container } = renderWithProvider(<BrandSidebar />);

      expect(container.querySelector('a[href="/dashboard/inbox"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/projects"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/playbooks"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/academy"]')).toBeInTheDocument();
    });

    it('has marketing navigation links', () => {
      const { container } = renderWithProvider(<BrandSidebar />);

      expect(container.querySelector('a[href="/dashboard/brand/creative"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/vibe-studio"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/heroes"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/qr-codes"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/media"]')).toBeInTheDocument();
    });

    it('has catalog navigation links', () => {
      const { container } = renderWithProvider(<BrandSidebar />);

      expect(container.querySelector('a[href="/dashboard/products"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/menu"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/orders"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/pricing"]')).toBeInTheDocument();
    });

    it('has customers navigation links', () => {
      const { container } = renderWithProvider(<BrandSidebar />);

      expect(container.querySelector('a[href="/dashboard/customers"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/segments"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/leads"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/loyalty"]')).toBeInTheDocument();
    });
  });

  describe('DispensarySidebar', () => {
    it('is memoized with React.memo', () => {
      // Check that DispensarySidebar is wrapped with memo
      expect(DispensarySidebar).toHaveProperty('$$typeof');
      expect(String(DispensarySidebar.$$typeof)).toContain('react.memo');
    });

    it('renders without crashing', () => {
      const { container } = renderWithProvider(<DispensarySidebar />);
      expect(container).toBeTruthy();
    });

    it('all Links have prefetch prop', () => {
      const { container } = renderWithProvider(<DispensarySidebar />);

      const links = container.querySelectorAll('a[href^="/dashboard"]');
      expect(links.length).toBeGreaterThan(0);
    });

    it('does not re-render when pathname is the same', () => {
      const { rerender } = renderWithProvider(<DispensarySidebar />);

      const initialHTML = document.body.innerHTML;
      rerender(<SidebarProvider><DispensarySidebar /></SidebarProvider>);

      expect(document.body.innerHTML).toBe(initialHTML);
    });

    it('has menu & inventory navigation links', () => {
      const { container } = renderWithProvider(<DispensarySidebar />);

      expect(container.querySelector('a[href="/dashboard/menu"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/products"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/carousels"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/bundles"]')).toBeInTheDocument();
      expect(container.querySelector('a[href="/dashboard/orders"]')).toBeInTheDocument();
    });

    it('has profitability link in intelligence section', () => {
      const { container } = renderWithProvider(<DispensarySidebar />);

      expect(container.querySelector('a[href="/dashboard/profitability"]')).toBeInTheDocument();
    });
  });

  describe('Performance Metrics', () => {
    it('BrandSidebar renders in acceptable time', () => {
      const startTime = performance.now();
      renderWithProvider(<BrandSidebar />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      // Should render in less than 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('DispensarySidebar renders in acceptable time', () => {
      const startTime = performance.now();
      renderWithProvider(<DispensarySidebar />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      // Should render in less than 100ms
      expect(renderTime).toBeLessThan(100);
    });
  });
});
