
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BrandSetupTab from '../brand-setup-tab';
import { useUserRole } from '@/hooks/use-user-role';
import { checkSlugAvailability, getBrandSlug } from '@/server/actions/slug-management';
import { useToast } from '@/hooks/use-toast';
import { getBrandStatus } from '@/app/dashboard/products/actions';

// Polyfill Request/Response for Next.js 15+ environment
if (typeof Request === 'undefined') {
  global.Request = class {
    constructor(input: any, init: any) {}
  } as any;
}
if (typeof Response === 'undefined') {
  global.Response = class {
    static json(data: any) { return { json: () => Promise.resolve(data) }; }
  } as any;
}
if (typeof Headers === 'undefined') {
  global.Headers = class {
    append() {}
  } as any;
}

// Mock Next.js modules
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  unstable_cache: jest.fn((fn) => fn),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock uuid to avoid ESM issues
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-123',
}));

// Mock the hooks and actions
jest.mock('@/hooks/use-user-role');
jest.mock('@/hooks/use-toast');
jest.mock('@/server/actions/slug-management', () => ({
  checkSlugAvailability: jest.fn(),
  getBrandSlug: jest.fn(),
  reserveSlug: jest.fn(),
}));
jest.mock('@/app/dashboard/products/actions', () => ({
  getBrandStatus: jest.fn(),
}));
jest.mock('@/server/actions/brand-setup', () => ({
  setupBrandAndCompetitors: jest.fn(),
}));

// Re-import the mocked functions for use in tests
import { checkSlugAvailability, getBrandSlug } from '@/server/actions/slug-management';
import { getBrandStatus } from '@/app/dashboard/products/actions';

// Mock UI components
jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: any) => (
    <input 
        type="checkbox" 
        id={id} 
        checked={checked} 
        onChange={(e) => onCheckedChange(e.target.checked)} 
        data-testid="switch"
    />
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h1>{children}</h1>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <button>{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('lucide-react', () => ({
  Globe: () => <div />,
  CheckCircle2: () => <div />,
  XCircle: () => <div />,
  Loader2: () => <div />,
  ExternalLink: () => <div />,
}));

describe('BrandSetupTab', () => {
    const mockToast = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand', brandId: 'brand-123' });
        (getBrandStatus as jest.Mock).mockResolvedValue({ brandName: 'Test Brand', nameLocked: false });
        (getBrandSlug as jest.Mock).mockResolvedValue(null);
    });

    it('should show slug availability as user types', async () => {
        (checkSlugAvailability as jest.Mock).mockResolvedValue({ available: true });
        
        render(<BrandSetupTab />);
        
        const slugInput = screen.getByTestId('slug-input');
        fireEvent.change(slugInput, { target: { value: 'my-new-slug' } });
        
        // Wait for debounced check
        await waitFor(() => {
            expect(checkSlugAvailability).toHaveBeenCalledWith('my-new-slug');
        });
        
        await waitFor(() => {
            expect(screen.getByText(/bakedbot.ai\/my-new-slug is available!/i)).toBeInTheDocument();
        });
    });

    it('should show vertically integrated toggle and POS info for brands', async () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });
        
        render(<BrandSetupTab />);
        
        // Check for toggle
        const toggle = screen.getByTestId('switch');
        expect(screen.getByText(/Vertically Integrated/i)).toBeInTheDocument();
        
        // Initially POS info hidden
        expect(screen.queryByText(/POS Integration Available/i)).not.toBeInTheDocument();
        
        // Turn on toggle
        fireEvent.click(toggle);
        
        // POS info should appear
        expect(screen.getByText(/POS Integration Available/i)).toBeInTheDocument();
    });

    it('should NOT show vertically integrated toggle for dispensaries', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'dispensary' });
        
        render(<BrandSetupTab />);
        
        expect(screen.queryByText(/Vertically Integrated/i)).not.toBeInTheDocument();
    });
});
