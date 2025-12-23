import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataImportDropdown } from '@/components/dashboard/data-import-dropdown';

// Mock dependencies
const mockUseUser = jest.fn();
jest.mock('@/hooks/use-user', () => ({
    useUser: () => mockUseUser(),
}));

const mockUseDataJobsListener = jest.fn();
jest.mock('@/lib/firebase/data-jobs-listener', () => ({
    useDataJobsListener: (uid: string) => mockUseDataJobsListener(uid),
}));

// Mock store
jest.mock('@/lib/store/notification-store', () => ({
    useNotificationStore: () => ({
        ingestionNotifications: [],
        toasts: [],
        addIngestionNotification: jest.fn(),
        updateIngestionNotification: jest.fn(),
        removeIngestionNotification: jest.fn(),
        clearCompletedNotifications: jest.fn(),
        hasActiveJobs: jest.fn(() => false),
        getPendingNotifications: jest.fn(() => []),
    }),
}));

// Mock icons
jest.mock('lucide-react', () => ({
    Bell: () => <div data-testid="bell-icon" />,
    CheckCircle: () => <div />,
    AlertCircle: () => <div />,
    Loader2: () => <div />,
    X: () => <div />,
}));

describe('DataImportDropdown', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('uses provided userId if available', () => {
        mockUseUser.mockReturnValue({ user: null }); // Should not fall back to this
        render(<DataImportDropdown userId="prop-uid" />);
        expect(mockUseDataJobsListener).toHaveBeenCalledWith('prop-uid');
    });

    it('falls back to useUser if userId prop is missing', () => {
        mockUseUser.mockReturnValue({ user: { uid: 'hook-uid' } });
        render(<DataImportDropdown />);
        expect(mockUseDataJobsListener).toHaveBeenCalledWith('hook-uid');
    });

    it('handles missing user gracefully', () => {
        mockUseUser.mockReturnValue({ user: null });
        render(<DataImportDropdown />);
        // Should call with undefined or null, component handles it
        // The implementation passes effectiveUserId which would be undefined
        expect(mockUseDataJobsListener).toHaveBeenCalledWith(undefined);
    });
});
