import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AccountManagementTab } from '@/components/admin/account-management-tab';
import { getAllUsers, deleteUserAccount } from '@/server/actions/delete-account';
import { getAllBrands, getAllDispensaries, deleteBrand, deleteDispensary } from '@/server/actions/delete-organization';
import { useToast } from '@/hooks/use-toast';

// Mock server actions
jest.mock('@/server/actions/delete-account', () => ({
    getAllUsers: jest.fn(),
    deleteUserAccount: jest.fn(),
}));

jest.mock('@/server/actions/delete-organization', () => ({
    getAllBrands: jest.fn(),
    getAllDispensaries: jest.fn(),
    deleteBrand: jest.fn(),
    deleteDispensary: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: jest.fn(),
}));

// Mock icons
jest.mock('lucide-react', () => ({
    Loader2: () => <div data-testid="icon-loader" />,
    Search: () => <div data-testid="icon-search" />,
    Trash2: () => <div data-testid="icon-trash" />,
    AlertTriangle: () => <div data-testid="icon-alert" />,
}));

// Mock Shadcn UI components with Context
jest.mock('@/components/ui/tabs', () => {
    const React = require('react');
    const TabsContext = React.createContext({ activeValue: '', onValueChange: (_: string) => {} });
    
    return {
        Tabs: ({ children, value, onValueChange }: any) => (
            <TabsContext.Provider value={{ activeValue: value, onValueChange }}>
                <div data-testid="tabs" data-value={value}>{children}</div>
            </TabsContext.Provider>
        ),
        TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
        TabsTrigger: ({ children, value }: any) => {
            const { onValueChange, activeValue } = React.useContext(TabsContext);
            return (
                <button 
                    data-testid={`tab-trigger-${value}`} 
                    onClick={() => onValueChange(value)}
                    data-state={activeValue === value ? 'active' : 'inactive'}
                >
                    {children}
                </button>
            );
        },
        TabsContent: ({ children, value }: any) => {
            const { activeValue } = React.useContext(TabsContext);
            return activeValue === value ? <div data-testid={`tabs-content-${value}`}>{children}</div> : null;
        },
    };
});

jest.mock('@/components/ui/card', () => ({
    Card: ({ children }: any) => <div data-testid="card">{children}</div>,
    CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
    CardTitle: ({ children }: any) => <h2 data-testid="card-title">{children}</h2>,
    CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
    CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}));

jest.mock('@/components/ui/table', () => ({
    Table: ({ children }: any) => <table data-testid="table">{children}</table>,
    TableHeader: ({ children }: any) => <thead data-testid="table-header">{children}</thead>,
    TableBody: ({ children }: any) => <tbody data-testid="table-body">{children}</tbody>,
    TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
    TableHead: ({ children }: any) => <th data-testid="table-head">{children}</th>,
    TableCell: ({ children }: any) => <td data-testid="table-cell">{children}</td>,
}));

jest.mock('@/components/ui/input', () => ({
    Input: (props: any) => <input data-testid="input" {...props} />,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled }: any) => (
        <button data-testid="button" onClick={onClick} disabled={disabled}>
            {children}
        </button>
    ),
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

// Mock Deletion Dialog
jest.mock('@/components/admin/delete-confirmation-dialog', () => ({
    DeleteConfirmationDialog: ({ open, onConfirm, title, itemName }: any) => (
        open ? (
            <div data-testid="delete-dialog">
                <h2>{title}</h2>
                <div data-testid="dialog-item-name">{itemName}</div>
                <button onClick={onConfirm}>Confirm Delete</button>
            </div>
        ) : null
    ),
}));

describe('AccountManagementTab', () => {
    const mockUsers = [
        { uid: 'u1', email: 'u1@test.com', displayName: 'User One', role: 'super_user', createdAt: '2023-12-31' },
        { uid: 'u2', email: 'u2@test.com', displayName: 'User Two', role: 'brand', createdAt: '2024-01-01' },
    ];

    const mockBrands = [
        { id: 'b1', name: 'Brand Alpha', claimed: true, pageCount: 5 },
    ];

    const mockDispensaries = [
        { id: 'd1', name: 'Disp Beta', claimed: false, pageCount: 10 },
    ];

    const mockToast = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (getAllUsers as jest.Mock).mockResolvedValue(mockUsers);
        (getAllBrands as jest.Mock).mockResolvedValue(mockBrands);
        (getAllDispensaries as jest.Mock).mockResolvedValue(mockDispensaries);
        (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    });

    it('renders and fetches data on mount', async () => {
        render(<AccountManagementTab />);
        await screen.findByText('u1@test.com');
        expect(getAllUsers).toHaveBeenCalled();
        expect(screen.getByText('User One')).toBeInTheDocument();
    });

    it('filters users by email', async () => {
        render(<AccountManagementTab />);
        await screen.findByText('u1@test.com');

        const searchInput = screen.getByPlaceholderText(/Search by email, name, or role.../i);
        fireEvent.change(searchInput, { target: { value: 'u2' } });

        expect(screen.queryByText('u1@test.com')).not.toBeInTheDocument();
        expect(screen.getByText('u2@test.com')).toBeInTheDocument();
    });

    it('opens delete dialog and successfully deletes a user', async () => {
        (deleteUserAccount as jest.Mock).mockResolvedValue({ success: true });
        render(<AccountManagementTab />);
        await screen.findByText('u2@test.com');

        const u2Row = screen.getByText('u2@test.com').closest('tr')!;
        const deleteBtn = u2Row.querySelector('button')!;
        fireEvent.click(deleteBtn);

        expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-item-name')).toHaveTextContent('u2@test.com');

        // Mock reload to return only u1
        (getAllUsers as jest.Mock).mockResolvedValue([mockUsers[0]]);

        fireEvent.click(screen.getByText('Confirm Delete'));

        await waitFor(() => {
            expect(deleteUserAccount).toHaveBeenCalledWith('u2');
        });

        await waitFor(() => {
            expect(screen.queryByText('u2@test.com')).not.toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('switches to organizations tab and deletes a brand', async () => {
        (deleteBrand as jest.Mock).mockResolvedValue({ success: true });
        render(<AccountManagementTab />);

        // Wait for initial load
        await screen.findByText('u1@test.com');

        // Switch tab
        const orgTabTrigger = screen.getByTestId('tab-trigger-organizations');
        fireEvent.click(orgTabTrigger);

        // Wait for brands to load (it's called in useEffect [activeTab])
        await screen.findByText('Brand Alpha');

        const brandRow = screen.getByText('Brand Alpha').closest('tr')!;
        const deleteBtn = brandRow.querySelector('button')!;
        fireEvent.click(deleteBtn);

        expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
        expect(screen.getByTestId('dialog-item-name')).toHaveTextContent('Brand Alpha');

        // Mock reload
        (getAllBrands as jest.Mock).mockResolvedValue([]);
        (getAllDispensaries as jest.Mock).mockResolvedValue(mockDispensaries);

        fireEvent.click(screen.getByText('Confirm Delete'));

        await waitFor(() => {
            expect(deleteBrand).toHaveBeenCalledWith('b1');
        });

        await waitFor(() => {
            expect(screen.queryByText('Brand Alpha')).not.toBeInTheDocument();
        }, { timeout: 3000 });
    });
});
