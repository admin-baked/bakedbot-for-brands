/**
 * Unit tests for BrandChatWidget
 *
 * Tests the authentication handling and props passed to PuffChat.
 * Verifies the fix for Issue #9 (Chat/AI Feature Server Components error)
 * by ensuring isAuthenticated prop is passed correctly.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock useUser hook BEFORE importing component
const mockUseUser = jest.fn();
jest.mock('@/firebase/auth/use-user', () => ({
    useUser: () => mockUseUser()
}));

// Mock PuffChat to verify props
const mockPuffChat = jest.fn();
jest.mock('@/app/dashboard/ceo/components/puff-chat', () => ({
    PuffChat: (props: any) => {
        mockPuffChat(props);
        return (
            <div data-testid="mock-puff-chat">
                <span data-testid="title">{props.initialTitle}</span>
                <span data-testid="hide-header">{props.hideHeader ? 'true' : 'false'}</span>
                <span data-testid="is-authenticated">{props.isAuthenticated ? 'true' : 'false'}</span>
            </div>
        );
    }
}));

// Import component after mocks
import { BrandChatWidget } from '../brand-chat-widget';

describe('BrandChatWidget', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Authenticated state (Issue #9 fix verification)', () => {
        it('renders PuffChat with correct props when authenticated', () => {
            mockUseUser.mockReturnValue({
                user: { uid: 'test-user-123', email: 'test@example.com' },
                isUserLoading: false
            });

            render(<BrandChatWidget />);

            const puffChat = screen.getByTestId('mock-puff-chat');
            expect(puffChat).toBeInTheDocument();

            expect(screen.getByTestId('title')).toHaveTextContent('Revenue Ops Assistant');
            expect(screen.getByTestId('hide-header')).toHaveTextContent('true');
            expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
        });

        it('passes isAuthenticated=true when user exists (critical fix)', () => {
            mockUseUser.mockReturnValue({
                user: { uid: 'test-user-123' },
                isUserLoading: false
            });

            render(<BrandChatWidget />);

            // This is the key fix: isAuthenticated prop must be passed
            // to prevent Server Components render errors
            expect(mockPuffChat).toHaveBeenCalledWith(
                expect.objectContaining({
                    isAuthenticated: true,
                    initialTitle: 'Revenue Ops Assistant',
                    hideHeader: true
                })
            );
        });

        it('provides brand-specific prompt suggestions', () => {
            mockUseUser.mockReturnValue({
                user: { uid: 'test-user-123' },
                isUserLoading: false
            });

            render(<BrandChatWidget />);

            // Verify promptSuggestions are passed for brand-specific queries
            expect(mockPuffChat).toHaveBeenCalledWith(
                expect.objectContaining({
                    promptSuggestions: expect.arrayContaining([
                        expect.stringContaining('velocity'),
                        expect.stringContaining('pricing'),
                    ])
                })
            );
        });
    });
});
