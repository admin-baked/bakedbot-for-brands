/**
 * Unit tests for TypewriterText component
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { TypewriterText } from '@/components/landing/typewriter-text';

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        span: ({ children, ...props }: any) => <span data-testid="cursor" {...props}>{children}</span>
    }
}));

describe('TypewriterText', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('renders empty initially', () => {
        render(<TypewriterText text="Hello World" />);
        // Should start with no text
        expect(screen.queryByText('Hello World')).not.toBeInTheDocument();
    });

    it('displays text character by character', async () => {
        render(<TypewriterText text="Hi" speed={100} />);
        
        // Initial state - no text
        expect(screen.queryByText('H')).not.toBeInTheDocument();
        
        // After first tick
        act(() => {
            jest.advanceTimersByTime(100);
        });
        await waitFor(() => {
            expect(screen.getByText('H')).toBeInTheDocument();
        });

        // After second tick
        act(() => {
            jest.advanceTimersByTime(100);
        });
        await waitFor(() => {
            expect(screen.getByText('Hi')).toBeInTheDocument();
        });
    });

    it('shows blinking cursor while typing', () => {
        render(<TypewriterText text="Test" />);
        expect(screen.getByTestId('cursor')).toBeInTheDocument();
    });

    it('hides cursor when complete', async () => {
        render(<TypewriterText text="AB" speed={50} />);
        
        // Complete the text
        act(() => {
            jest.advanceTimersByTime(50); // A
            jest.advanceTimersByTime(50); // B
        });

        await waitFor(() => {
            expect(screen.getByText('AB')).toBeInTheDocument();
        });

        // Cursor should be gone
        expect(screen.queryByTestId('cursor')).not.toBeInTheDocument();
    });

    it('calls onComplete when done', async () => {
        const onComplete = jest.fn();
        render(<TypewriterText text="X" speed={50} onComplete={onComplete} />);
        
        act(() => {
            jest.advanceTimersByTime(50);
        });

        await waitFor(() => {
            expect(onComplete).toHaveBeenCalledTimes(1);
        });
    });

    it('resets when text prop changes', async () => {
        const { rerender } = render(<TypewriterText text="First" speed={10} />);
        
        act(() => {
            jest.advanceTimersByTime(50); // Type some of "First"
        });

        // Change the text
        rerender(<TypewriterText text="Second" speed={10} />);
        
        // Should reset and start typing "Second"
        act(() => {
            jest.advanceTimersByTime(10);
        });

        await waitFor(() => {
            expect(screen.getByText('S')).toBeInTheDocument();
        });
    });

    it('applies custom className', () => {
        const { container } = render(
            <TypewriterText text="Test" className="custom-class" />
        );
        expect(container.firstChild).toHaveClass('custom-class');
    });
});
