/**
 * Tests for Content Pagination Component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ContentPagination } from '../content-pagination';

describe('ContentPagination', () => {
    const defaultProps = {
        hasMore: true,
        isFirstPage: false,
        onNextPage: jest.fn(),
        onPreviousPage: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render pagination controls', () => {
        render(<ContentPagination {...defaultProps} />);

        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should call onNextPage when Next button clicked', () => {
        render(<ContentPagination {...defaultProps} />);

        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);

        expect(defaultProps.onNextPage).toHaveBeenCalledTimes(1);
    });

    it('should call onPreviousPage when Previous button clicked', () => {
        render(<ContentPagination {...defaultProps} />);

        const previousButton = screen.getByText('Previous');
        fireEvent.click(previousButton);

        expect(defaultProps.onPreviousPage).toHaveBeenCalledTimes(1);
    });

    it('should disable Previous button on first page', () => {
        render(<ContentPagination {...defaultProps} isFirstPage={true} />);

        const previousButton = screen.getByText('Previous');
        expect(previousButton).toBeDisabled();
    });

    it('should disable Next button when no more pages', () => {
        render(<ContentPagination {...defaultProps} hasMore={false} />);

        const nextButton = screen.getByText('Next');
        expect(nextButton).toBeDisabled();
    });

    it('should disable both buttons when loading', () => {
        render(<ContentPagination {...defaultProps} loading={true} />);

        const previousButton = screen.getByText('Previous');
        const nextButton = screen.getByText('Next');

        expect(previousButton).toBeDisabled();
        expect(nextButton).toBeDisabled();
    });

    it('should display page label when provided', () => {
        const pageLabel = 'Page 2 of 5';
        render(<ContentPagination {...defaultProps} pageLabel={pageLabel} />);

        expect(screen.getByText(pageLabel)).toBeInTheDocument();
    });

    it('should not display page label when not provided', () => {
        const { container } = render(<ContentPagination {...defaultProps} />);

        // Should only have two buttons, no label
        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBe(2);
    });

    it('should enable both buttons on middle page with more content', () => {
        render(<ContentPagination {...defaultProps} isFirstPage={false} hasMore={true} />);

        const previousButton = screen.getByText('Previous');
        const nextButton = screen.getByText('Next');

        expect(previousButton).not.toBeDisabled();
        expect(nextButton).not.toBeDisabled();
    });

    it('should show chevron icons', () => {
        const { container } = render(<ContentPagination {...defaultProps} />);

        // Check for SVG elements (chevron icons)
        const svgs = container.querySelectorAll('svg');
        expect(svgs.length).toBeGreaterThanOrEqual(2); // At least 2 chevrons
    });

    it('should handle rapid clicks gracefully', () => {
        render(<ContentPagination {...defaultProps} />);

        const nextButton = screen.getByText('Next');

        // Click multiple times rapidly
        fireEvent.click(nextButton);
        fireEvent.click(nextButton);
        fireEvent.click(nextButton);

        // Each click should trigger the callback
        expect(defaultProps.onNextPage).toHaveBeenCalledTimes(3);
    });

    it('should not call callbacks when buttons are disabled', () => {
        render(
            <ContentPagination
                {...defaultProps}
                isFirstPage={true}
                hasMore={false}
            />
        );

        const previousButton = screen.getByText('Previous');
        const nextButton = screen.getByText('Next');

        fireEvent.click(previousButton);
        fireEvent.click(nextButton);

        expect(defaultProps.onPreviousPage).not.toHaveBeenCalled();
        expect(defaultProps.onNextPage).not.toHaveBeenCalled();
    });
});
