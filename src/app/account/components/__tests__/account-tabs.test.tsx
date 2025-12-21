import { render, screen } from '@testing-library/react';
import { AccountTabs } from '../account-tabs';
import { TabsContent } from '@/components/ui/tabs';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('lucide-react', () => ({
    User: () => <div data-testid="icon-user" />,
    CreditCard: () => <div data-testid="icon-credit-card" />,
    LayoutGrid: () => <div data-testid="icon-layout-grid" />,
    Plug: () => <div data-testid="icon-plug" />,
}));

describe('AccountTabs', () => {
    it('renders all tab triggers', () => {
        render(
            <AccountTabs>
                <TabsContent value="profile">Profile Content</TabsContent>
            </AccountTabs>
        );

        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Subscription')).toBeInTheDocument();
        expect(screen.getByText('Integrations')).toBeInTheDocument();
    });

    it('renders children content', () => {
        render(
            <AccountTabs defaultValue="profile">
                <TabsContent value="profile">Test Content</TabsContent>
            </AccountTabs>
        );

        expect(screen.getByText('Test Content')).toBeInTheDocument();
    });
});
