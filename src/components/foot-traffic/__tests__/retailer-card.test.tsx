
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RetailerCard } from '../retailer-card';
import { RetailerSummary } from '@/types/foot-traffic';
import * as analytics from '@/lib/analytics';

// Mock dependencies
jest.mock('@/lib/analytics', () => ({
    trackEvent: jest.fn(),
}));

const mockRetailer: RetailerSummary = {
    id: 'r1',
    name: 'Test Dispensary',
    address: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    distance: 2.5
};

describe('RetailerCard', () => {
    it('renders retailer details', () => {
        render(<RetailerCard retailer={mockRetailer} isPartner={false} zipCode="90001" />);
        expect(screen.getByText('Test Dispensary')).toBeInTheDocument();
        expect(screen.getByText('2.5 mi')).toBeInTheDocument();
    });

    it('shows "Own this listing" link for non-partners (P4.1)', () => {
        render(<RetailerCard retailer={mockRetailer} isPartner={false} zipCode="90001" />);
        const claimLink = screen.getByText(/Own this business/i);
        expect(claimLink).toBeInTheDocument();
        expect(claimLink.getAttribute('href')).toContain('/for-brands?retailerId=r1');
    });

    it('tracks "claim_listing_click" when claim link is clicked', () => {
        render(<RetailerCard retailer={mockRetailer} isPartner={false} zipCode="90001" />);
        const claimLink = screen.getByText(/Own this business/i);

        fireEvent.click(claimLink);

        expect(analytics.trackEvent).toHaveBeenCalledWith(expect.objectContaining({
            name: 'claim_listing_click',
            properties: expect.objectContaining({
                retailerId: 'r1',
                zipCode: '90001'
            })
        }));
    });

    it('hides claim link for partners', () => {
        render(<RetailerCard retailer={mockRetailer} isPartner={true} zipCode="90001" />);
        expect(screen.queryByText(/Own this business/i)).not.toBeInTheDocument();
    });
});
