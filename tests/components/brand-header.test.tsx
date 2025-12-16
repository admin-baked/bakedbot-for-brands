import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandHeader } from '@/components/brand/brand-header';

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

// Mock useUser
jest.mock('@/firebase/auth/use-user', () => ({
    useUser: () => ({
        user: null,
        loading: false,
    }),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Menu: () => <div data-testid="Menu" />,
    Search: () => <div data-testid="Search" />,
    User: () => <div data-testid="User" />,
    CheckCircle: () => <div data-testid="CheckCircle" />,
}));

describe('BrandHeader', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders brand name and search input', () => {
        render(<BrandHeader brandName="TestBrand" />);
        expect(screen.getByText('TestBrand')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Find TestBrand near you...')).toBeInTheDocument();
    });

    it('updates zip code input', () => {
        render(<BrandHeader brandName="TestBrand" />);
        const input = screen.getByPlaceholderText('Find TestBrand near you...');
        fireEvent.change(input, { target: { value: '90210' } });
        expect(input).toHaveValue('90210');
    });

    it('navigates to the correct URL on search', () => {
        render(<BrandHeader brandName="Test Brand" />);
        const input = screen.getByPlaceholderText('Find Test Brand near you...');

        // Enter ZIP
        fireEvent.change(input, { target: { value: '90210' } });

        // Click search (or submit form)
        const searchButton = screen.getByText('Search');
        fireEvent.click(searchButton);

        expect(mockPush).toHaveBeenCalledWith('/brands/test-brand/near/90210');
    });

    it('does not navigate on empty or invalid zip', () => {
        render(<BrandHeader brandName="Test Brand" />);
        const searchButton = screen.getByText('Search');

        fireEvent.click(searchButton);
        expect(mockPush).not.toHaveBeenCalled();

        const input = screen.getByPlaceholderText('Find Test Brand near you...');
        fireEvent.change(input, { target: { value: '123' } }); // too short
        fireEvent.click(searchButton);
        expect(mockPush).not.toHaveBeenCalled();
    });
});
