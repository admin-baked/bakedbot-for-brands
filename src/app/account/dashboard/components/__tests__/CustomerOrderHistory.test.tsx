
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomerOrderHistory from '../customer-order-history';
import { Timestamp } from 'firebase/firestore';
import type { DeepPartial } from '@/types/utils';
import type { OrderDoc } from '@/firebase/converters';

// Mock next/link
jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode, href: string }) => {
        return <a href={href}>{children}</a>;
    };
});

const mockOrders: DeepPartial<OrderDoc>[] = [
    {
        id: 'order123abc',
        createdAt: Timestamp.fromDate(new Date('2024-01-15')),
        status: 'completed',
        totals: { total: 125.50 },
    },
    {
        id: 'order456def',
        createdAt: Timestamp.fromDate(new Date('2024-01-18')),
        status: 'ready',
        totals: { total: 75.00 },
    },
];


describe('CustomerOrderHistory', () => {
    it('should render the loading state with skeletons', () => {
        render(<CustomerOrderHistory orders={null} isLoading={true} />);

        // Check for the main title
        expect(screen.getByText('Order History')).toBeInTheDocument();
        
        // Check for skeletons (presence of elements with 'animate-pulse' class)
        const skeletons = screen.getAllByRole('generic').filter(el => el.classList.contains('animate-pulse'));
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render the empty state when no orders are provided', () => {
        render(<CustomerOrderHistory orders={[]} isLoading={false} />);

        expect(screen.getByText("You haven't placed any orders yet.")).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Start Shopping' })).toBeInTheDocument();
    });

    it('should render a list of orders correctly', () => {
        render(<CustomerOrderHistory orders={mockOrders} isLoading={false} />);

        // Check for order 1
        expect(screen.getByText(/#order123.../)).toBeInTheDocument();
        expect(screen.getByText(new Date('2024-01-15').toLocaleDateString())).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        expect(screen.getByText('$125.50')).toBeInTheDocument();

        // Check for order 2
        expect(screen.getByText(/#order456.../)).toBeInTheDocument();
        expect(screen.getByText(new Date('2024-01-18').toLocaleDateString())).toBeInTheDocument();
        expect(screen.getByText('Ready')).toBeInTheDocument();
        expect(screen.getByText('$75.00')).toBeInTheDocument();
    });

    it('should create correct links for order IDs', () => {
        render(<CustomerOrderHistory orders={mockOrders} isLoading={false} />);
        
        const link1 = screen.getByText(/#order123.../);
        expect(link1).toHaveAttribute('href', '/order-confirmation/order123abc');
    });

    it('should display correct status badges and colors', () => {
        const orderWithCancelled: DeepPartial<OrderDoc>[] = [
            { id: 'abc', status: 'cancelled', totals: { total: 10 } },
            { id: 'def', status: 'pending', totals: { total: 20 } },
        ];
        render(<CustomerOrderHistory orders={orderWithCancelled} isLoading={false} />);

        const cancelledBadge = screen.getByText('Cancelled');
        const pendingBadge = screen.getByText('Pending');

        expect(cancelledBadge).toHaveClass('bg-red-500/20');
        expect(pendingBadge).toHaveClass('bg-yellow-500/20');
    });
});
