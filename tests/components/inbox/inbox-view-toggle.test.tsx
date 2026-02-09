import { render, screen, fireEvent } from '@testing-library/react';
import { InboxViewToggle } from '@/components/inbox/inbox-view-toggle';
import { useInboxStore } from '@/lib/store/inbox-store';

// Mock the inbox store
jest.mock('@/lib/store/inbox-store');

describe('InboxViewToggle Component', () => {
    const mockSetViewMode = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('UI Rendering', () => {
        it('should render both view mode buttons', () => {
            (useInboxStore as unknown as jest.Mock).mockReturnValue({
                viewMode: 'inbox',
                setViewMode: mockSetViewMode,
            });

            render(<InboxViewToggle />);

            // Check for Inbox button
            expect(screen.getByRole('button', { name: /inbox/i })).toBeInTheDocument();

            // Check for Chat button
            expect(screen.getByRole('button', { name: /chat/i })).toBeInTheDocument();
        });

        it('should highlight the inbox button when viewMode is "inbox"', () => {
            (useInboxStore as unknown as jest.Mock).mockReturnValue({
                viewMode: 'inbox',
                setViewMode: mockSetViewMode,
            });

            const { container } = render(<InboxViewToggle />);

            // Find the inbox button and check if it has default variant styling
            const inboxButton = screen.getByRole('button', { name: /inbox/i });
            expect(inboxButton.className).toContain('bg-primary'); // Default variant has primary background
        });

        it('should highlight the chat button when viewMode is "chat"', () => {
            (useInboxStore as unknown as jest.Mock).mockReturnValue({
                viewMode: 'chat',
                setViewMode: mockSetViewMode,
            });

            const { container } = render(<InboxViewToggle />);

            // Find the chat button and check if it has default variant styling
            const chatButton = screen.getByRole('button', { name: /chat/i });
            expect(chatButton.className).toContain('bg-primary'); // Default variant has primary background
        });
    });

    describe('User Interactions', () => {
        it('should call setViewMode with "inbox" when inbox button is clicked', () => {
            (useInboxStore as unknown as jest.Mock).mockReturnValue({
                viewMode: 'chat',
                setViewMode: mockSetViewMode,
            });

            render(<InboxViewToggle />);

            const inboxButton = screen.getByRole('button', { name: /inbox/i });
            fireEvent.click(inboxButton);

            expect(mockSetViewMode).toHaveBeenCalledTimes(1);
            expect(mockSetViewMode).toHaveBeenCalledWith('inbox');
        });

        it('should call setViewMode with "chat" when chat button is clicked', () => {
            (useInboxStore as unknown as jest.Mock).mockReturnValue({
                viewMode: 'inbox',
                setViewMode: mockSetViewMode,
            });

            render(<InboxViewToggle />);

            const chatButton = screen.getByRole('button', { name: /chat/i });
            fireEvent.click(chatButton);

            expect(mockSetViewMode).toHaveBeenCalledTimes(1);
            expect(mockSetViewMode).toHaveBeenCalledWith('chat');
        });

        it('should allow toggling between views multiple times', () => {
            const { rerender } = render(<InboxViewToggle />);

            // Start with inbox view
            (useInboxStore as unknown as jest.Mock).mockReturnValue({
                viewMode: 'inbox',
                setViewMode: mockSetViewMode,
            });
            rerender(<InboxViewToggle />);

            // Click chat button
            const chatButton = screen.getByRole('button', { name: /chat/i });
            fireEvent.click(chatButton);
            expect(mockSetViewMode).toHaveBeenCalledWith('chat');

            // Switch to chat view
            (useInboxStore as unknown as jest.Mock).mockReturnValue({
                viewMode: 'chat',
                setViewMode: mockSetViewMode,
            });
            rerender(<InboxViewToggle />);

            // Click inbox button
            const inboxButton = screen.getByRole('button', { name: /inbox/i });
            fireEvent.click(inboxButton);
            expect(mockSetViewMode).toHaveBeenCalledWith('inbox');

            expect(mockSetViewMode).toHaveBeenCalledTimes(2);
        });
    });

    describe('Accessibility', () => {
        it('should have accessible button roles', () => {
            (useInboxStore as unknown as jest.Mock).mockReturnValue({
                viewMode: 'inbox',
                setViewMode: mockSetViewMode,
            });

            render(<InboxViewToggle />);

            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThanOrEqual(2);
        });

        it('should render icons for both buttons', () => {
            (useInboxStore as unknown as jest.Mock).mockReturnValue({
                viewMode: 'inbox',
                setViewMode: mockSetViewMode,
            });

            const { container } = render(<InboxViewToggle />);

            // Check for SVG icons (Lucide icons render as SVG)
            const svgs = container.querySelectorAll('svg');
            expect(svgs.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Custom className', () => {
        it('should apply custom className prop', () => {
            (useInboxStore as unknown as jest.Mock).mockReturnValue({
                viewMode: 'inbox',
                setViewMode: mockSetViewMode,
            });

            const { container } = render(<InboxViewToggle className="custom-class" />);

            expect(container.firstChild).toHaveClass('custom-class');
        });
    });

    describe('State Persistence', () => {
        it('should reflect the persisted viewMode from store on mount', () => {
            (useInboxStore as unknown as jest.Mock).mockReturnValue({
                viewMode: 'chat',
                setViewMode: mockSetViewMode,
            });

            render(<InboxViewToggle />);

            const chatButton = screen.getByRole('button', { name: /chat/i });
            expect(chatButton.className).toContain('bg-primary');
        });
    });
});
