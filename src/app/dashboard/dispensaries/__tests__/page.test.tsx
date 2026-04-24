
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DispensariesPage from '../page';
import { getBrandDispensaries } from '../actions';
import { useToast } from '@/hooks/use-toast';

jest.mock('../actions', () => ({
  getBrandDispensaries: jest.fn(),
  searchDispensaries: jest.fn(),
  addDispensary: jest.fn(),
  getPurchaseModel: jest.fn().mockResolvedValue({ model: 'local_pickup', checkoutUrl: '' }),
  updatePurchaseModel: jest.fn(),
}));
jest.mock('@/hooks/use-toast');

// Mock UI components to avoid JSDOM issues
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children }: any) => <div>{children}</div>,
  RadioGroupItem: ({ value }: any) => <input type="radio" value={value} readOnly />,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
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

jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader" />,
  Plus: () => <div />,
  MapPin: () => <div />,
  Store: () => <div data-testid="store-icon" />,
  Globe: () => <div />,
  ShoppingCart: () => <div />,
  ExternalLink: () => <div />,
}));

describe('DispensariesPage', () => {
    const mockToast = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    });

    it('should show empty state if no dispensaries returned', async () => {
        (getBrandDispensaries as jest.Mock).mockResolvedValue({ partners: [] });
        
        render(<DispensariesPage />);
        
        await waitFor(() => {
            expect(screen.getByText(/No dispensaries yet/i)).toBeInTheDocument();
        });
    });

    it('should handle error gracefully and show toast', async () => {
        (getBrandDispensaries as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

        render(<DispensariesPage />);

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to load data.'
            }));
        });
    });

    it('should show list of dispensaries when data is returned', async () => {
        const mockPartners = [
            { id: '1', name: 'Disp A', city: 'Chicago', state: 'IL', source: 'manual' }
        ];
        (getBrandDispensaries as jest.Mock).mockResolvedValue({ partners: mockPartners });
        
        render(<DispensariesPage />);
        
        await waitFor(() => {
            expect(screen.getByText('Disp A')).toBeInTheDocument();
        });
    });
});
