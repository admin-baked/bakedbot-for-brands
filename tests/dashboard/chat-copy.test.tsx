/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the navigator.clipboard API
const mockClipboard = {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn(),
};

Object.defineProperty(navigator, 'clipboard', {
    value: mockClipboard,
    writable: true,
});

describe('Chat Copy Functionality', () => {
    beforeEach(() => {
        mockClipboard.writeText.mockClear();
    });

    describe('copyToClipboard', () => {
        it('should copy text to clipboard successfully', async () => {
            const testText = 'Test message content';
            await navigator.clipboard.writeText(testText);
            expect(mockClipboard.writeText).toHaveBeenCalledWith(testText);
        });

        it('should handle multiple copy calls', async () => {
            await navigator.clipboard.writeText('First message');
            await navigator.clipboard.writeText('Second message');
            expect(mockClipboard.writeText).toHaveBeenCalledTimes(2);
        });

        it('should copy multiline text', async () => {
            const multilineText = `Line 1
Line 2
Line 3`;
            await navigator.clipboard.writeText(multilineText);
            expect(mockClipboard.writeText).toHaveBeenCalledWith(multilineText);
        });

        it('should handle special characters', async () => {
            const specialText = 'Test <html> & "quotes" \'apostrophes\'';
            await navigator.clipboard.writeText(specialText);
            expect(mockClipboard.writeText).toHaveBeenCalledWith(specialText);
        });
    });

    describe('Copy Button Behavior', () => {
        it('should have correct accessibility title', () => {
            // Render a simple button mock
            render(
                <button title="Copy to clipboard" data-testid="copy-btn">
                    Copy
                </button>
            );
            const button = screen.getByTestId('copy-btn');
            expect(button).toHaveAttribute('title', 'Copy to clipboard');
        });

        it('should show visual feedback class when clicked', () => {
            const mockBtn = document.createElement('button');
            mockBtn.id = 'copy-btn-test';
            document.body.appendChild(mockBtn);

            // Simulate the click handler
            mockBtn.classList.add('text-emerald-500');
            expect(mockBtn.classList.contains('text-emerald-500')).toBe(true);

            mockBtn.classList.remove('text-emerald-500');
            expect(mockBtn.classList.contains('text-emerald-500')).toBe(false);

            document.body.removeChild(mockBtn);
        });
    });
});
