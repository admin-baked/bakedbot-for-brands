import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HeroClient } from '../hero-client';

jest.mock('@/components/landing/live-stats', () => ({
    LiveStats: () => <div data-testid="live-stats">Stats</div>,
}));

const auditPopupMock = jest.fn();

jest.mock('@/components/audit/audit-popup', () => ({
    AuditPopup: (props: Record<string, unknown>) => {
        auditPopupMock(props);
        return <div data-testid="audit-popup" />;
    },
}));

jest.mock('lucide-react', () => ({
    ArrowRight: () => <div data-testid="icon-arrow-right" />,
    Search: () => <div data-testid="icon-search" />,
}));

describe('HeroClient', () => {
    beforeEach(() => {
        auditPopupMock.mockClear();
    });

    it('renders the new operator-focused headline and CTAs', () => {
        render(<HeroClient />);

        expect(screen.getByText(/Turn more first visits into/i)).toBeInTheDocument();
        expect(screen.getByText(/repeat revenue/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Book a Strategy Call/i })).toHaveAttribute('href', '/book/martez');
        expect(screen.getByRole('link', { name: /Run the AI Retention Audit/i })).toHaveAttribute('href', '/ai-retention-audit');
    });

    it('opens the audit popup with the submitted URL', () => {
        render(<HeroClient />);

        fireEvent.change(
            screen.getByPlaceholderText(/Enter your dispensary website to score capture and retention readiness/i),
            { target: { value: 'greenreleaf.com' } }
        );

        fireEvent.click(screen.getByRole('button', { name: /Score My Site/i }));

        const lastCall = auditPopupMock.mock.calls[auditPopupMock.mock.calls.length - 1]?.[0] as Record<string, unknown>;
        expect(lastCall).toMatchObject({
            open: true,
            initialUrl: 'greenreleaf.com',
        });
    });
});
