import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SetupHealth } from '@/components/dashboard/setup-health';
import { useUserRole } from '@/hooks/use-user-role';
import { getSetupHealth } from '@/server/actions/setup-health';
import '@testing-library/jest-dom';

// Mock useUserRole
jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: jest.fn(),
}));

// Mock getSetupHealth action
jest.mock('@/server/actions/setup-health', () => ({
    getSetupHealth: jest.fn(),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Database: () => <div data-testid="icon-database" />,
    Globe: () => <div data-testid="icon-globe" />,
    Shield: () => <div data-testid="icon-shield" />,
    Mail: () => <div data-testid="icon-mail" />,
    Loader2: () => <div data-testid="loader" />,
    AlertCircle: () => <div data-testid="icon-alert" />,
}));

const MOCK_HEALTH = {
    dataConnected: { status: 'green', message: 'Connected', action: 'view_data' },
    publishingLive: { status: 'yellow', message: 'Drafts ready', action: 'publish_pages' },
    complianceReady: { status: 'red', message: 'Missing config', action: 'configure_compliance' },
    deliveryChannels: { status: 'green', message: 'Email active', action: 'view_integrations' },
};

describe('SetupHealth', () => {
    beforeEach(() => {
        (useUserRole as jest.Mock).mockReturnValue({ user: { uid: 'user_1' }, role: 'brand' });
        (getSetupHealth as jest.Mock).mockResolvedValue(MOCK_HEALTH);
    });

    it('renders loading state initially', () => {
        render(<SetupHealth />);
        expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('renders 4 health tiles with correct information', async () => {
        render(<SetupHealth />);
        
        await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

        expect(screen.getByText('Data Connected')).toBeInTheDocument();
        expect(screen.getByText('Connected')).toBeInTheDocument();

        expect(screen.getByText('Publishing Live')).toBeInTheDocument();
        expect(screen.getByText('Drafts ready')).toBeInTheDocument();

        expect(screen.getByText('Compliance Ready')).toBeInTheDocument();
        expect(screen.getByText('Missing config')).toBeInTheDocument();

        expect(screen.getByText('Delivery Channels')).toBeInTheDocument();
        expect(screen.getByText('Email active')).toBeInTheDocument();
    });

    it('shows "Fix It" button only for non-green statuses', async () => {
        render(<SetupHealth />);
        
        await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

        // yellow and red tiles should have "Fix It"
        const fixButtons = screen.getAllByRole('button', { name: /Fix It/i });
        expect(fixButtons).toHaveLength(2); // One for yellow, one for red
    });

    it('triggers onActionClick with correct action when "Fix It" is clicked', async () => {
        const onActionClick = jest.fn();
        render(<SetupHealth onActionClick={onActionClick} />);
        
        await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

        // Find the "Fix It" button associated with "Compliance Ready" (the last one)
        const fixButtons = screen.getAllByRole('button', { name: /Fix It/i });
        // In our mock: publishingLive is yellow (fixButtons[0]), complianceReady is red (fixButtons[1])
        fireEvent.click(fixButtons[1]);
        
        expect(onActionClick).toHaveBeenCalledWith('configure_compliance');
    });

    it('renders error state if action fails', async () => {
        (getSetupHealth as jest.Mock).mockRejectedValue(new Error('Fetch failed'));
        render(<SetupHealth />);
        
        await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());
        
        expect(screen.getByText('Unable to load setup health')).toBeInTheDocument();
    });
});
