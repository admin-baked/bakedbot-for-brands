
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocalSearchBar } from '../local-search-bar';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

describe('LocalSearchBar', () => {
    const mockPush = jest.fn();

    beforeEach(() => {
        (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
        jest.clearAllMocks();
    });

    it('renders input correctly', () => {
        render(<LocalSearchBar zipCode="90001" />);
        expect(screen.getByPlaceholderText(/Search products/i)).toBeInTheDocument();
    });

    it('navigates to search results on submit (P6.1)', () => {
        render(<LocalSearchBar zipCode="90001" />);
        const input = screen.getByPlaceholderText(/Search products/i);

        fireEvent.change(input, { target: { value: 'blue dream' } });
        fireEvent.submit(input.closest('form')!);

        expect(mockPush).toHaveBeenCalledWith('/local/90001/search?q=blue%20dream');
    });

    it('does not navigate on empty submission', () => {
        render(<LocalSearchBar zipCode="90001" />);
        const input = screen.getByPlaceholderText(/Search products/i);

        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.submit(input.closest('form')!);

        expect(mockPush).not.toHaveBeenCalled();
    });
});
