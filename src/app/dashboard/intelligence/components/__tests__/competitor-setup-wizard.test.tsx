
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompetitorSetupWizard } from '../competitor-setup-wizard';
import { useUserRole } from '@/hooks/use-user-role';
import { searchLeaflyCompetitors } from '../../actions/setup';
import { useToast } from '@/hooks/use-toast';

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

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h1>{children}</h1>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <button>{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

// Mock Lucide icons to avoid rendering issues in tests
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  Store: () => <div data-testid="store-icon" />,
  Package: () => <div data-testid="package-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  MapPin: () => <div data-testid="map-pin-icon" />,
  Loader2: () => <div data-testid="loader-icon" />
}));

// Mock the hooks
jest.mock('@/hooks/use-user-role');
jest.mock('@/hooks/use-toast');
jest.mock('../../actions/setup');

describe('CompetitorSetupWizard', () => {
    const mockToast = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    });

    it('should show brand terminology when role is brand', async () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });
        
        render(<CompetitorSetupWizard hasCompetitors={false} />);
        
        // Step 1: Market Location
        expect(screen.getByText(/Where are your competing brands located/i)).toBeInTheDocument();
        
        // Mock search results
        (searchLeaflyCompetitors as jest.Mock).mockResolvedValue([
            { id: '1', name: 'Brand A', city: 'Chicago', state: 'IL' }
        ]);
        
        // Fill out search and trigger
        const cityInput = screen.getByTestId('city-input');
        const stateInput = screen.getByTestId('state-input');
        
        fireEvent.input(cityInput, { target: { value: 'Chicago' } });
        fireEvent.change(cityInput, { target: { value: 'Chicago' } });
        
        fireEvent.input(stateInput, { target: { value: 'IL' } });
        fireEvent.change(stateInput, { target: { value: 'IL' } });
        
        // Find search button via aria-label
        const searchButton = screen.getByRole('button', { name: /search/i });
        fireEvent.click(searchButton);
        
        // Wait for step 2
        const nextTitle = await screen.findByText(/Select brands to track/i);
        expect(nextTitle).toBeInTheDocument();
        expect(screen.getByText('Brand A')).toBeInTheDocument();
    });

    it('should show dispensary terminology when role is dispensary', async () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'dispensary' });
        
        render(<CompetitorSetupWizard hasCompetitors={false} />);
        
        // Step 1: Market Location
        expect(screen.getByText(/Where are your competitor dispensaries located/i)).toBeInTheDocument();
        
        // Mock search results
        (searchLeaflyCompetitors as jest.Mock).mockResolvedValue([
            { id: '2', name: 'Dispensary B', city: 'Chicago', state: 'IL' }
        ]);
        
        // Fill out search and trigger
        const cityInput = screen.getByTestId('city-input');
        const stateInput = screen.getByTestId('state-input');
        
        fireEvent.input(cityInput, { target: { value: 'Chicago' } });
        fireEvent.change(cityInput, { target: { value: 'Chicago' } });
        
        fireEvent.input(stateInput, { target: { value: 'IL' } });
        fireEvent.change(stateInput, { target: { value: 'IL' } });
        
        const searchButton = screen.getByRole('button', { name: /search/i });
        fireEvent.click(searchButton);
        
        // Wait for step 2
        const nextTitle = await screen.findByText(/Select dispensaries to track/i);
        expect(nextTitle).toBeInTheDocument();
        expect(screen.getByText('Dispensary B')).toBeInTheDocument();
    });

    it('should use overrideRole if provided', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'dispensary' });
        
        render(<CompetitorSetupWizard hasCompetitors={false} overrideRole="brand" />);
        
        expect(screen.getByText(/Where are your competing brands located/i)).toBeInTheDocument();
    });
});
