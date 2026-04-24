import React from 'react';
import { render, screen } from '@testing-library/react';
import CreativeCommandCenterPage from '@/app/dashboard/brand/creative/page';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Loader2: () => <div data-testid="icon-loader" />,
}));

// Mock Next.js router
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: mockReplace,
        push: jest.fn(),
    }),
}));

describe('Creative Command Center Page (Redirect)', () => {
    beforeEach(() => {
        mockReplace.mockClear();
    });

    it('renders redirect message', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByText('Redirecting to Creative Command Center...')).toBeInTheDocument();
    });

    it('shows a loader', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
    });

    it('redirects to /dashboard/creative', () => {
        render(<CreativeCommandCenterPage />);
        expect(mockReplace).toHaveBeenCalledWith('/dashboard/creative');
    });
});
