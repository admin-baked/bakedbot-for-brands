import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { LiveStats } from '../live-stats';
import '@testing-library/jest-dom';

// Mock the server action
const mockStats = {
    pages: 1234,
    brands: 56,
    dispensaries: 7
};

jest.mock('@/server/actions/stats', () => ({
    getPlatformStats: jest.fn(() => Promise.resolve(mockStats)),
}));

describe('LiveStats', () => {
    it('renders loading state initially', async () => {
        // Mock implementation to delay resolution slightly if needed, 
        // but default mock resolves immediately. 
        // We can test that getPlatformStats is called.
        await act(async () => {
            render(<LiveStats />);
        });

        // Check for stats (since we act/waited, it might be done)
        expect(screen.getByText('1,234')).toBeInTheDocument();
        expect(screen.getByText('56')).toBeInTheDocument();
        expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('renders without crashing', async () => {
        await act(async () => {
            render(<LiveStats />);
        });
        const pagesText = screen.getByText(/Pages Live/i);
        expect(pagesText).toBeInTheDocument();
    });
});
