import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FFFAuditTool } from '@/components/audit/fff-audit-tool';

// Mock dependencies if needed
jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: any) => <img {...props} />,
}));

// Mock Logo component
jest.mock('@/components/logo', () => {
    return function MockLogo() {
        return <div data-testid="mock-logo">Logo</div>;
    };
});

describe('FFFAuditTool', () => {
    it('renders in public mode (locked) by default', () => {
        render(<FFFAuditTool isInternal={false} />);
        
        // Should show "Preview" badge
        expect(screen.getByText('Preview')).toBeInTheDocument();
        
        // Should show "Unlock the full report" card
        expect(screen.getByText('Unlock the full report')).toBeInTheDocument();
        
        // Should show email input
        expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('renders in internal mode (unlocked)', () => {
        render(<FFFAuditTool isInternal={true} />);
        
        // Should show "Unlocked" badge
        expect(screen.getByText('Unlocked')).toBeInTheDocument();
        
        // Should NOT show "Unlock the full report"
        expect(screen.queryByText('Unlock the full report')).not.toBeInTheDocument();
        
        // Should show "Top 3 growth leaks" immediately
        expect(screen.getByText('Top 3 growth leaks')).toBeInTheDocument();
    });

    it('hides header when showHeader is false', () => {
        render(<FFFAuditTool showHeader={false} />);
        expect(screen.queryByTestId('mock-logo')).not.toBeInTheDocument();
    });

    it('shows header when showHeader is true', () => {
        render(<FFFAuditTool showHeader={true} />);
        expect(screen.getByTestId('mock-logo')).toBeInTheDocument();
    });
});
