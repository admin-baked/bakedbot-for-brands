
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BundleBuilder } from '@/components/dispensary/bundle-builder';
import { BundleDeal } from '@/types/bundles';

// Mock Lucide icons to avoid ESM issues in Jest environment if not transforming
jest.mock('lucide-react', () => ({
    Plus: () => <div data-testid="icon-plus" />,
    Check: () => <div data-testid="icon-check" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    AlertCircle: () => <div data-testid="icon-alert" />
}));

const mockDeal: BundleDeal = {
    id: 'test-bundle',
    name: 'Test Bundle',
    description: 'Buy 3 items',
    type: 'mix_match',
    minProducts: 3,
    bundlePrice: 45.00,
    eligibleProductIds: ['prod-1', 'prod-2'],
    originalTotal: 60.00
};

describe.skip('BundleBuilder', () => {
    it('renders correctly when open', () => {
        render(<BundleBuilder deal={mockDeal} open={true} onOpenChange={() => { }} />);

        expect(screen.getByText('Test Bundle')).toBeInTheDocument();
        expect(screen.getByText('Buy 3 items')).toBeInTheDocument();
        expect(screen.getByText('$45.00')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(<BundleBuilder deal={mockDeal} open={false} onOpenChange={() => { }} />);

        const dialogTitle = screen.queryByText('Test Bundle');
        expect(dialogTitle).not.toBeInTheDocument();
    });

    // More complex interaction tests would go here (adding products etc)
    // but require mocking the internal state or user events which might be better for E2E
});
