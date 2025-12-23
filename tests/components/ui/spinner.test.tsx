import React from 'react';
import { render, screen } from '@testing-library/react';
import { Spinner } from '@/components/ui/spinner';

// Mock Image component since it handles src loading
jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: any) => <img {...props} />,
}));

describe('Spinner Component', () => {
    it('renders the animated GIF by default', () => {
        render(<Spinner />);
        const img = screen.getByAltText('Loading');
        expect(img).toHaveAttribute('src', expect.stringContaining('smokey%20animated%20spinner.gif'));
        expect(img.getAttribute('src')).toContain('storage.googleapis.com');
    });

    it('renders the static PNG when variant is static', () => {
        render(<Spinner variant="static" />);
        const img = screen.getByAltText('Loading');
        expect(img).toHaveAttribute('src', expect.stringContaining('Untitled%20design.png'));
    });

    it('applies size classes correctly', () => {
        const { rerender } = render(<Spinner size="sm" />);
        let img = screen.getByAltText('Loading');
        expect(img).toHaveClass('h-8 w-8');

        rerender(<Spinner size="xl" />);
        img = screen.getByAltText('Loading');
        expect(img).toHaveClass('h-24 w-24');
    });

    it('renders label when provided', () => {
        render(<Spinner label="Testing..." />);
        expect(screen.getByText('Testing...')).toBeInTheDocument();
    });
});
