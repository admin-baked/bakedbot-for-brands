import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { AccountManagementTab } from '@/components/admin/account-management-tab';
import {
  getAllUsers,
  promoteToSuperUser,
  approveUser,
  rejectUser,
} from '@/app/dashboard/ceo/actions';
import { deleteUserAccount } from '@/server/actions/delete-account';
import {
  getAllBrands,
  getAllDispensaries,
  deleteBrand,
  deleteDispensary,
} from '@/server/actions/delete-organization';

const mockToast = jest.fn();

jest.mock('@/app/dashboard/ceo/actions', () => ({
  getAllUsers: jest.fn(),
  promoteToSuperUser: jest.fn(),
  approveUser: jest.fn(),
  rejectUser: jest.fn(),
}));

jest.mock('@/server/actions/delete-account', () => ({
  deleteUserAccount: jest.fn(),
}));

jest.mock('@/server/actions/delete-organization', () => ({
  getAllBrands: jest.fn(),
  getAllDispensaries: jest.fn(),
  deleteBrand: jest.fn(),
  deleteDispensary: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: mockToast,
  })),
}));

jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="icon-loader" />,
  Search: () => <div data-testid="icon-search" />,
  Trash2: () => <div data-testid="icon-trash" />,
  AlertTriangle: () => <div data-testid="icon-alert" />,
}));

type TabsProps = {
  children: React.ReactNode;
  value: string;
  onValueChange?: (value: string) => void;
};

type TabsChildProps = {
  children: React.ReactNode;
  value: string;
};

type DivProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

type BadgeProps = {
  children: React.ReactNode;
};

type DeleteDialogProps = {
  open: boolean;
  onConfirm: () => void;
  title: string;
  itemName: string;
};

jest.mock('@/components/ui/tabs', () => {
  const React = require('react');
  const TabsContext = React.createContext<{
    activeValue: string;
    onValueChange?: (value: string) => void;
  }>({
    activeValue: 'users',
  });

  return {
    Tabs: ({ children, value, onValueChange }: TabsProps) => (
      <TabsContext.Provider value={{ activeValue: value, onValueChange }}>
        <div data-testid="tabs" data-value={value}>
          {children}
        </div>
      </TabsContext.Provider>
    ),
    TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
    TabsTrigger: ({ children, value }: TabsChildProps) => {
      const { activeValue, onValueChange } = React.useContext(TabsContext);

      return (
        <button
          data-state={activeValue === value ? 'active' : 'inactive'}
          data-testid={`tab-trigger-${value}`}
          type="button"
          onClick={() => onValueChange?.(value)}
        >
          {children}
        </button>
      );
    },
    TabsContent: ({ children, value }: TabsChildProps) => {
      const { activeValue } = React.useContext(TabsContext);
      return activeValue === value ? <div data-testid={`tabs-content-${value}`}>{children}</div> : null;
    },
  };
});

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: DivProps) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: DivProps) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2 data-testid="card-title">{children}</h2>,
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="card-description">{children}</p>
  ),
  CardContent: ({ children }: DivProps) => <div data-testid="card-content">{children}</div>,
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table data-testid="table">{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: InputProps) => <input {...props} />,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: ButtonProps) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: BadgeProps) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/admin/delete-confirmation-dialog', () => ({
  DeleteConfirmationDialog: ({ open, onConfirm, title, itemName }: DeleteDialogProps) =>
    open ? (
      <div data-testid="delete-dialog">
        <h2>{title}</h2>
        <div data-testid="dialog-item-name">{itemName}</div>
        <button type="button" onClick={onConfirm}>
          Confirm Delete
        </button>
      </div>
    ) : null,
}));

const mockedGetAllUsers = getAllUsers as jest.MockedFunction<typeof getAllUsers>;
const mockedPromoteToSuperUser = promoteToSuperUser as jest.MockedFunction<typeof promoteToSuperUser>;
const mockedApproveUser = approveUser as jest.MockedFunction<typeof approveUser>;
const mockedRejectUser = rejectUser as jest.MockedFunction<typeof rejectUser>;
const mockedDeleteUserAccount = deleteUserAccount as jest.MockedFunction<typeof deleteUserAccount>;
const mockedGetAllBrands = getAllBrands as jest.MockedFunction<typeof getAllBrands>;
const mockedGetAllDispensaries = getAllDispensaries as jest.MockedFunction<typeof getAllDispensaries>;
const mockedDeleteBrand = deleteBrand as jest.MockedFunction<typeof deleteBrand>;
const mockedDeleteDispensary = deleteDispensary as jest.MockedFunction<typeof deleteDispensary>;

describe('AccountManagementTab', () => {
  const mockUsers = [
    {
      id: 'u1',
      email: 'u1@test.com',
      displayName: 'User One',
      role: 'super_user',
      roles: ['super_user'],
      createdAt: '2023-12-31T00:00:00.000Z',
      approvalStatus: 'approved' as const,
    },
    {
      id: 'u2',
      email: 'u2@test.com',
      displayName: 'User Two',
      role: 'brand',
      roles: ['brand'],
      createdAt: '2024-01-01T00:00:00.000Z',
      approvalStatus: 'approved' as const,
    },
  ];

  const mockBrands = [{ id: 'b1', name: 'Brand Alpha', claimed: true, pageCount: 5 }];
  const mockDispensaries = [{ id: 'd1', name: 'Disp Beta', claimed: false, pageCount: 10 }];

  beforeEach(() => {
    jest.clearAllMocks();

    mockedGetAllUsers.mockResolvedValue(mockUsers);
    mockedPromoteToSuperUser.mockResolvedValue({ success: true, message: 'ok' });
    mockedApproveUser.mockResolvedValue(undefined);
    mockedRejectUser.mockResolvedValue(undefined);
    mockedDeleteUserAccount.mockResolvedValue({ success: true });
    mockedGetAllBrands.mockResolvedValue(mockBrands);
    mockedGetAllDispensaries.mockResolvedValue(mockDispensaries);
    mockedDeleteBrand.mockResolvedValue({ success: true });
    mockedDeleteDispensary.mockResolvedValue({ success: true });
  });

  it('loads user accounts on mount', async () => {
    render(<AccountManagementTab />);

    expect(await screen.findByText('u1@test.com')).toBeInTheDocument();
    expect(mockedGetAllUsers).toHaveBeenCalledTimes(1);
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('u2@test.com')).toBeInTheDocument();
  });

  it('filters users by email, name, or role', async () => {
    render(<AccountManagementTab />);

    await screen.findByText('u1@test.com');

    fireEvent.change(screen.getByPlaceholderText(/search by email, name, or role/i), {
      target: { value: 'u2' },
    });

    expect(screen.queryByText('u1@test.com')).not.toBeInTheDocument();
    expect(screen.getByText('u2@test.com')).toBeInTheDocument();
  });

  it('opens the delete dialog and deletes a user account', async () => {
    mockedGetAllUsers
      .mockResolvedValueOnce(mockUsers)
      .mockResolvedValueOnce([mockUsers[0]]);

    render(<AccountManagementTab />);

    const targetRow = (await screen.findByText('u2@test.com')).closest('tr');
    expect(targetRow).not.toBeNull();

    fireEvent.click(targetRow!.querySelector('button:last-of-type') as HTMLButtonElement);

    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-item-name')).toHaveTextContent('u2@test.com');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));

    await waitFor(() => {
      expect(mockedDeleteUserAccount).toHaveBeenCalledWith('u2');
    });

    await waitFor(() => {
      expect(screen.queryByText('u2@test.com')).not.toBeInTheDocument();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Success',
        description: 'User deleted successfully',
      }),
    );
  });

  it('loads organizations and deletes a brand from the organizations tab', async () => {
    mockedGetAllBrands
      .mockResolvedValueOnce(mockBrands)
      .mockResolvedValueOnce([]);
    mockedGetAllDispensaries
      .mockResolvedValueOnce(mockDispensaries)
      .mockResolvedValueOnce(mockDispensaries);

    render(<AccountManagementTab />);

    await screen.findByText('u1@test.com');

    fireEvent.click(screen.getByTestId('tab-trigger-organizations'));

    const brandRow = (await screen.findByText('Brand Alpha')).closest('tr');
    expect(brandRow).not.toBeNull();

    fireEvent.click(brandRow!.querySelector('button') as HTMLButtonElement);

    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-item-name')).toHaveTextContent('Brand Alpha');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));

    await waitFor(() => {
      expect(mockedDeleteBrand).toHaveBeenCalledWith('b1');
    });

    await waitFor(() => {
      expect(screen.queryByText('Brand Alpha')).not.toBeInTheDocument();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Success',
        description: 'Brand deleted successfully',
      }),
    );
  });
});
