import { render, screen } from '@testing-library/react';
import { SubscriptionView } from '../subscription-view';
import '@testing-library/jest-dom';

// Mock modules
jest.mock('@/hooks/use-plan-info', () => ({
    usePlanInfo: () => ({
        planName: 'Pro Plan',
        price: 99,
        isPaid: true,
        features: {
            maxZips: 10,
            advancedReporting: true,
            maxPlaybooks: 5,
        },
        isLoading: false,
    }),
}));

jest.mock('@/hooks/use-user', () => ({
    useUser: () => ({
        userData: {
            currentOrgId: 'org-123',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
        },
        isLoading: false,
    }),
}));

// Mock the complex BillingForm to avoid deep render issues
jest.mock('@/app/dashboard/settings/components/billing-form', () => ({
    BillingForm: () => <div data-testid="billing-form">Mock Billing Form</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
    Check: () => <span>CheckIcon</span>,
    Loader2: () => <span>LoaderIcon</span>,
}));

describe('SubscriptionView', () => {
    it('renders current plan details', () => {
        render(<SubscriptionView />);

        expect(screen.getByText('Pro Plan')).toBeInTheDocument();
        expect(screen.getByText('$99/mo')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders features list', () => {
        render(<SubscriptionView />);

        expect(screen.getByText('Up to 10 ZIP codes')).toBeInTheDocument();
        expect(screen.getByText('Advanced Reporting')).toBeInTheDocument();
    });

    it('renders the billing form', () => {
        render(<SubscriptionView />);
        expect(screen.getByTestId('billing-form')).toBeInTheDocument();
    });
});
