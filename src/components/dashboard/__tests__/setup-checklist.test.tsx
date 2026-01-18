
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SetupChecklist } from '../setup-checklist';
import { useUserRole } from '@/hooks/use-user-role';

jest.mock('@/hooks/use-user-role');

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="check-circle" />,
  Circle: () => <div />,
  Clock: () => <div />,
  ChevronRight: () => <div />,
  X: () => <div data-testid="x-icon" />,
  Package: () => <div />,
  Store: () => <div />,
  Bot: () => <div />,
  FileSearch: () => <div />,
  Shield: () => <div />,
  Megaphone: () => <div />,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardDescription: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => <div data-testid="progress" data-value={value} />,
}));

// Mock fetch for dispensary status
global.fetch = jest.fn();

describe('SetupChecklist', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ linkedDispensary: null, posConnected: false })
        });
    });

    it('should show 5 focused items for brands', async () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });
        
        render(<SetupChecklist />);
        
        // Wait for potential async effects (though loadChecklist is immediate for brands)
        const items = screen.getAllByRole('link');
        expect(items).toHaveLength(5);
        
        expect(screen.getByText(/Add your products/i)).toBeInTheDocument();
        expect(screen.getByText(/Add "Where to Buy" retailers/i)).toBeInTheDocument();
        expect(screen.getByText(/Launch your Headless Menu/i)).toBeInTheDocument();
        expect(screen.getByText(/Activate Smokey AI Budtender/i)).toBeInTheDocument();
        expect(screen.getByText(/Run Menu \+ SEO Audit/i)).toBeInTheDocument();
    });

    it('should show dispensary checklist for dispensaries', async () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'dispensary' });
        
        render(<SetupChecklist />);
        
        const items = await screen.findAllByRole('link');
        expect(items.length).toBeGreaterThan(5); // Dispensaries have ~7 items
        expect(screen.getByText(/Link your dispensary/i)).toBeInTheDocument();
    });

    it('should show progress correctly', async () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });
        
        render(<SetupChecklist />);
        
        const progress = screen.getByTestId('progress');
        expect(progress).toHaveAttribute('data-value', '0');
    });

    it('should allow dismissing the checklist', async () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });
        
        render(<SetupChecklist />);
        
        const dismissButton = screen.getByRole('button', { name: /dismiss/i });
        fireEvent.click(dismissButton);
        
        expect(screen.queryByTestId('card')).not.toBeInTheDocument();
        expect(localStorage.getItem('setup-checklist-dismissed')).toBe('true');
    });

    it('should not show if already dismissed in localStorage', async () => {
        localStorage.setItem('setup-checklist-dismissed', 'true');
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });
        
        render(<SetupChecklist />);
        
        expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });
});
