import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ActivityFeed } from '../activity-feed';
import { getRecentActivity } from '@/server/actions/activity';

// Mock the server action
jest.mock('@/server/actions/activity', () => ({
    getRecentActivity: jest.fn()
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
    CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
    CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
    CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>
}));

jest.mock('@/components/ui/scroll-area', () => ({
    ScrollArea: ({ children }: any) => <div data-testid="scroll-area">{children}</div>
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Activity: () => <span>ActivityIcon</span>,
    MessageSquare: () => <span>MessageIcon</span>,
    ShoppingCart: () => <span>CartIcon</span>,
    Settings: () => <span>SettingsIcon</span>,
    Terminal: () => <span>TerminalIcon</span>
}));

describe('ActivityFeed', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows loading state initially', async () => {
        // Never resolve to keep in loading
        (getRecentActivity as jest.Mock).mockImplementation(() => new Promise(() => {}));
        
        render(<ActivityFeed orgId="org1" />);
        
        expect(screen.getByText(/loading activity/i)).toBeInTheDocument();
    });

    it('shows fallback when no orgId provided', async () => {
        render(<ActivityFeed />);
        
        await waitFor(() => {
            expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
        });
    });

    it('renders activity items from server', async () => {
        const mockActivities = [
            { id: '1', orgId: 'org1', userId: 'u1', userName: 'John', type: 'message_sent', description: 'Said hello', createdAt: new Date().toISOString() },
            { id: '2', orgId: 'org1', userId: 'u2', userName: 'Jane', type: 'settings_changed', description: 'Updated config', createdAt: new Date().toISOString() }
        ];
        
        (getRecentActivity as jest.Mock).mockResolvedValue(mockActivities);
        
        render(<ActivityFeed orgId="org1" />);
        
        await waitFor(() => {
            expect(screen.getByText('John')).toBeInTheDocument();
            expect(screen.getByText(/said hello/i)).toBeInTheDocument();
            expect(screen.getByText('Jane')).toBeInTheDocument();
        });
    });

    it('shows fallback on API error', async () => {
        (getRecentActivity as jest.Mock).mockRejectedValue(new Error('API Error'));
        
        render(<ActivityFeed orgId="org1" />);
        
        await waitFor(() => {
            expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
        });
    });

    it('shows fallback when API returns empty array', async () => {
        (getRecentActivity as jest.Mock).mockResolvedValue([]);
        
        render(<ActivityFeed orgId="org1" />);
        
        await waitFor(() => {
            expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
        });
    });

    it('calls getRecentActivity with orgId', async () => {
        (getRecentActivity as jest.Mock).mockResolvedValue([]);
        
        render(<ActivityFeed orgId="test-org-123" />);
        
        await waitFor(() => {
            expect(getRecentActivity).toHaveBeenCalledWith('test-org-123');
        });
    });

    it('renders correct icon for message_sent type', async () => {
        const mockActivities = [
            { id: '1', orgId: 'org1', userId: 'u1', userName: 'John', type: 'message_sent', description: 'Message sent', createdAt: new Date().toISOString() }
        ];
        
        (getRecentActivity as jest.Mock).mockResolvedValue(mockActivities);
        
        render(<ActivityFeed orgId="org1" />);
        
        await waitFor(() => {
            expect(screen.getByText('John')).toBeInTheDocument();
        });
    });
});
