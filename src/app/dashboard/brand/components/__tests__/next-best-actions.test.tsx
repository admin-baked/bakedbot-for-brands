import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { NextBestActions } from '../next-best-actions';
import { getNextBestActions } from '../../actions';

// Mock the server action
jest.mock('../../actions', () => ({
    getNextBestActions: jest.fn()
}));

// Mock next/link
jest.mock('next/link', () => {
    return function Link({ children, href }: { children: React.ReactNode, href: string }) {
        return <a href={href}>{children}</a>;
    };
});

// Mock UI components
jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
    CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
    CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
    CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children }: any) => <span data-testid="badge">{children}</span>
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Zap: () => <span>ZapIcon</span>,
    ArrowRight: () => <span>ArrowIcon</span>,
    AlertCircle: () => <span>AlertIcon</span>,
    TrendingUp: () => <span>TrendingIcon</span>,
    Package: () => <span>PackageIcon</span>,
    Eye: () => <span>EyeIcon</span>,
    DollarSign: () => <span>DollarIcon</span>,
    CheckCircle: () => <span>CheckIcon</span>
}));

describe('NextBestActions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows loading state initially', async () => {
        // Never resolve to keep in loading state
        (getNextBestActions as jest.Mock).mockImplementation(() => new Promise(() => {}));
        
        render(<NextBestActions brandId="brand1" />);
        
        expect(screen.getByText(/loading recommendations/i)).toBeInTheDocument();
    });

    it('shows "All caught up" when no actions exist', async () => {
        (getNextBestActions as jest.Mock).mockResolvedValue([]);
        
        render(<NextBestActions brandId="brand1" />);
        
        await waitFor(() => {
            expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
        });
    });

    it('renders action cards with correct content', async () => {
        const mockActions = [
            {
                id: 'add-products',
                title: 'Add Products Now',
                description: 'Your catalog is empty',
                priority: 'high',
                type: 'growth',
                cta: 'Start Adding',
                href: '/dashboard/products'
            }
        ];
        
        (getNextBestActions as jest.Mock).mockResolvedValue(mockActions);
        
        render(<NextBestActions brandId="brand1" />);
        
        await waitFor(() => {
            expect(screen.getByText('Add Products Now')).toBeInTheDocument();
            expect(screen.getByText(/your catalog is empty/i)).toBeInTheDocument();
        });
    });

    it('displays priority badges correctly', async () => {
        const mockActions = [
            { id: 'a1', title: 'High Priority', description: 'Test', priority: 'high', type: 'growth', cta: 'Go' },
            { id: 'a2', title: 'Medium Priority', description: 'Test', priority: 'medium', type: 'intel', cta: 'Go' }
        ];
        
        (getNextBestActions as jest.Mock).mockResolvedValue(mockActions);
        
        render(<NextBestActions brandId="brand1" />);
        
        await waitFor(() => {
            expect(screen.getByText('high')).toBeInTheDocument();
            expect(screen.getByText('medium')).toBeInTheDocument();
        });
    });

    it('renders action links when href is provided', async () => {
        const mockActions = [
            { id: 'a1', title: 'With Link', description: 'Test', priority: 'high', type: 'growth', cta: 'Go Now', href: '/dashboard/products' }
        ];
        
        (getNextBestActions as jest.Mock).mockResolvedValue(mockActions);
        
        render(<NextBestActions brandId="brand1" />);
        
        await waitFor(() => {
            const link = screen.getByRole('link');
            expect(link).toHaveAttribute('href', '/dashboard/products');
        });
    });

    it('calls getNextBestActions with brandId', async () => {
        (getNextBestActions as jest.Mock).mockResolvedValue([]);
        
        render(<NextBestActions brandId="test-brand-123" />);
        
        await waitFor(() => {
            expect(getNextBestActions).toHaveBeenCalledWith('test-brand-123');
        });
    });
});
