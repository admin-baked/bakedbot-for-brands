import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CustomerDetailClient from '../page-client';
import { getCustomerDetail, getCustomerOrders } from '../actions';

const mockPush = jest.fn();
const mockToast = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

jest.mock('../actions', () => ({
    getCustomerDetail: jest.fn(),
    getCustomerOrders: jest.fn(),
    updateCustomerNotes: jest.fn().mockResolvedValue(undefined),
    updateCustomerTags: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

jest.mock('../../components/customer-chat-dialog', () => ({
    CustomerChatDialog: ({ open }: { open: boolean }) => open ? <div>CRM Chat Dialog Open</div> : null,
}));

jest.mock('../../components/customer-message-sandbox-dialog', () => ({
    CustomerMessageSandboxDialog: ({ open }: { open: boolean }) => open ? <div>Sandbox Dialog Open</div> : null,
}));

describe('customer detail client', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (getCustomerDetail as jest.Mock).mockResolvedValue({
            customer: {
                id: 'customer-1',
                orgId: 'org-a',
                email: 'customer@example.com',
                displayName: 'Michael Green Joseph',
                firstName: 'Michael',
                lastName: 'Green Joseph',
                phone: '555-555-5555',
                totalSpent: 983,
                orderCount: 12,
                avgOrderValue: 82,
                lastOrderDate: new Date('2026-03-11T00:00:00Z'),
                firstOrderDate: new Date('2025-11-28T00:00:00Z'),
                daysSinceLastOrder: 0,
                preferredCategories: [],
                preferredProducts: [],
                priceRange: 'budget',
                segment: 'vip',
                tier: 'silver',
                points: 982,
                lifetimeValue: 983,
                customTags: ['Manual Tag'],
                autoTags: ['VIP', 'Silver Tier'],
                allTags: ['Manual Tag', 'VIP', 'Silver Tier'],
                source: 'manual',
                createdAt: new Date('2025-11-28T00:00:00Z'),
                updatedAt: new Date('2026-03-11T00:00:00Z'),
            },
            spending: null,
            orgName: 'Allo',
            communications: [],
            upcoming: [
                {
                    id: 'scheduled-1',
                    customerEmail: 'customer@example.com',
                    type: 'welcome',
                    subject: 'Welcome to Allo, Michael',
                    scheduledFor: new Date('2026-03-12T10:00:00Z'),
                    status: 'pending',
                    channel: 'email',
                    preview: 'Next email preview',
                    playbookId: 'playbook-welcome',
                    metadata: { playbookKind: 'welcome' },
                },
            ],
            playbooks: [
                {
                    playbookKind: 'welcome',
                    name: 'Welcome Email',
                    description: 'Welcome customers',
                    appliesNow: true,
                    assignmentStatus: 'active',
                    playbookId: 'playbook-welcome',
                    lastCommunicationAt: new Date('2026-03-10T10:00:00Z'),
                    lastCommunicationChannel: 'email',
                    nextScheduledAt: new Date('2026-03-12T10:00:00Z'),
                    nextScheduledSubject: 'Welcome to Allo, Michael',
                },
                {
                    playbookKind: 'winback',
                    name: 'Win-Back',
                    description: 'Win back customers',
                    appliesNow: false,
                    assignmentStatus: 'missing',
                    playbookId: null,
                    lastCommunicationAt: null,
                    lastCommunicationChannel: null,
                    nextScheduledAt: null,
                    nextScheduledSubject: null,
                },
                {
                    playbookKind: 'vip',
                    name: 'VIP Appreciation',
                    description: 'VIP appreciation',
                    appliesNow: true,
                    assignmentStatus: 'paused',
                    playbookId: 'playbook-vip',
                    lastCommunicationAt: null,
                    lastCommunicationChannel: null,
                    nextScheduledAt: null,
                    nextScheduledSubject: null,
                },
            ],
        });

        (getCustomerOrders as jest.Mock).mockResolvedValue({
            orders: [],
            preferences: {
                categories: ['flower'],
                products: ['Blue Dream'],
                strains: [],
                brands: [],
            },
            autoTags: ['VIP', 'Silver Tier', 'Prefers Flower'],
            source: 'all_orders_cache',
        });
    });

    it('opens the CRM chat dialog instead of redirecting to inbox', async () => {
        render(<CustomerDetailClient customerId="customer-1" orgId="org-a" />);

        fireEvent.click(await screen.findByRole('button', { name: /chat about customer/i }));

        expect(await screen.findByText('CRM Chat Dialog Open')).toBeInTheDocument();
        expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/dashboard/inbox'));
    });

    it('renders auto tags in the notes and tags tab', async () => {
        render(<CustomerDetailClient customerId="customer-1" orgId="org-a" />);

        fireEvent.click(await screen.findByRole('tab', { name: /notes & tags/i }));

        expect(await screen.findByText('Auto Tags')).toBeInTheDocument();
        expect(screen.getByText('Prefers Flower')).toBeInTheDocument();
    });

    it('renders the next message card from upcoming communication data', async () => {
        render(<CustomerDetailClient customerId="customer-1" orgId="org-a" />);

        await waitFor(() => {
            expect(screen.getByText('Welcome to Allo, Michael')).toBeInTheDocument();
        });
        expect(screen.getByText('Next email preview')).toBeInTheDocument();
    });
});
