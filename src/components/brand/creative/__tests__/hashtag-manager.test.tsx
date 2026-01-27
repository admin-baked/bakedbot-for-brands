/**
 * Tests for Hashtag Manager Component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { HashtagManager } from '../hashtag-manager';

describe('HashtagManager', () => {
    const defaultProps = {
        hashtags: [],
        onChange: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render empty state', () => {
        render(<HashtagManager {...defaultProps} />);

        expect(screen.getByText('Hashtag Manager')).toBeInTheDocument();
        expect(screen.getByText('No hashtags added yet')).toBeInTheDocument();
    });

    it('should display existing hashtags', () => {
        const hashtags = ['#cannabis', '#weed', '#420'];
        render(<HashtagManager {...defaultProps} hashtags={hashtags} />);

        hashtags.forEach((tag) => {
            expect(screen.getByText(tag)).toBeInTheDocument();
        });
    });

    it('should add hashtag on Enter key', () => {
        render(<HashtagManager {...defaultProps} />);

        const input = screen.getByPlaceholderText(/Add hashtag/i);
        fireEvent.change(input, { target: { value: 'cannabis' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(defaultProps.onChange).toHaveBeenCalledWith(['#cannabis']);
    });

    it('should add hashtag on Add button click', () => {
        render(<HashtagManager {...defaultProps} />);

        const input = screen.getByPlaceholderText(/Add hashtag/i);
        fireEvent.change(input, { target: { value: 'weed' } });

        const addButton = screen.getByText('Add');
        fireEvent.click(addButton);

        expect(defaultProps.onChange).toHaveBeenCalledWith(['#weed']);
    });

    it('should auto-add # prefix if missing', () => {
        render(<HashtagManager {...defaultProps} />);

        const input = screen.getByPlaceholderText(/Add hashtag/i);
        fireEvent.change(input, { target: { value: 'cannabis' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(defaultProps.onChange).toHaveBeenCalledWith(['#cannabis']);
    });

    it('should normalize hashtag to lowercase', () => {
        render(<HashtagManager {...defaultProps} />);

        const input = screen.getByPlaceholderText(/Add hashtag/i);
        fireEvent.change(input, { target: { value: 'Cannabis' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(defaultProps.onChange).toHaveBeenCalledWith(['#cannabis']);
    });

    it('should remove spaces from hashtags', () => {
        render(<HashtagManager {...defaultProps} />);

        const input = screen.getByPlaceholderText(/Add hashtag/i);
        fireEvent.change(input, { target: { value: 'cannabis community' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(defaultProps.onChange).toHaveBeenCalledWith(['#cannabiscommunity']);
    });

    it('should not add duplicate hashtags', () => {
        const hashtags = ['#cannabis'];
        render(<HashtagManager {...defaultProps} hashtags={hashtags} />);

        const input = screen.getByPlaceholderText(/Add hashtag/i);
        fireEvent.change(input, { target: { value: 'cannabis' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(defaultProps.onChange).not.toHaveBeenCalled();
    });

    it('should not add empty hashtags', () => {
        render(<HashtagManager {...defaultProps} />);

        const input = screen.getByPlaceholderText(/Add hashtag/i);
        fireEvent.change(input, { target: { value: '' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(defaultProps.onChange).not.toHaveBeenCalled();
    });

    it('should remove hashtag when X clicked', () => {
        const hashtags = ['#cannabis', '#weed'];
        render(<HashtagManager {...defaultProps} hashtags={hashtags} />);

        const removeButtons = screen.getAllByRole('button', { name: '' });
        fireEvent.click(removeButtons[0]); // Click first X button

        expect(defaultProps.onChange).toHaveBeenCalledWith(['#weed']);
    });

    it('should remove last hashtag on Backspace when input empty', () => {
        const hashtags = ['#cannabis', '#weed'];
        render(<HashtagManager {...defaultProps} hashtags={hashtags} />);

        const input = screen.getByPlaceholderText(/Add hashtag/i);
        fireEvent.keyDown(input, { key: 'Backspace' });

        expect(defaultProps.onChange).toHaveBeenCalledWith(['#cannabis']);
    });

    it('should not remove hashtag on Backspace if input has text', () => {
        const hashtags = ['#cannabis'];
        render(<HashtagManager {...defaultProps} hashtags={hashtags} />);

        const input = screen.getByPlaceholderText(/Add hashtag/i);
        fireEvent.change(input, { target: { value: 'test' } });
        fireEvent.keyDown(input, { key: 'Backspace' });

        expect(defaultProps.onChange).not.toHaveBeenCalled();
    });

    it('should respect maxHashtags limit', () => {
        const hashtags = Array.from({ length: 30 }, (_, i) => `#tag${i}`);
        render(<HashtagManager {...defaultProps} hashtags={hashtags} maxHashtags={30} />);

        const input = screen.getByPlaceholderText(/Add hashtag/i);
        expect(input).toBeDisabled();
    });

    it('should show usage count', () => {
        const hashtags = ['#cannabis', '#weed'];
        render(<HashtagManager {...defaultProps} hashtags={hashtags} maxHashtags={30} />);

        expect(screen.getByText(/2\/30 used/i)).toBeInTheDocument();
    });

    it('should show platform-specific suggestions', () => {
        render(<HashtagManager {...defaultProps} platform="instagram" showSuggestions={true} />);

        expect(screen.getByText('Trending for instagram')).toBeInTheDocument();
        expect(screen.getByText('#weedstagram')).toBeInTheDocument();
    });

    it('should hide suggestions when showSuggestions is false', () => {
        render(<HashtagManager {...defaultProps} showSuggestions={false} />);

        expect(screen.queryByText(/Trending for/i)).not.toBeInTheDocument();
    });

    it('should add suggested hashtag when clicked', () => {
        render(<HashtagManager {...defaultProps} platform="instagram" showSuggestions={true} />);

        const suggestion = screen.getByText('#weedstagram');
        fireEvent.click(suggestion);

        expect(defaultProps.onChange).toHaveBeenCalledWith(['#weedstagram']);
    });

    it('should not show already-added hashtags in suggestions', () => {
        const hashtags = ['#cannabis'];
        render(
            <HashtagManager
                {...defaultProps}
                hashtags={hashtags}
                platform="instagram"
                showSuggestions={true}
            />
        );

        expect(screen.queryByText('#cannabis')).toBeInTheDocument(); // In current hashtags
        // But #cannabis should not appear in suggestions section
        const suggestions = screen.getByText(/Trending for/i).parentElement;
        expect(suggestions?.textContent).not.toContain('#cannabis');
    });

    it('should show "Show more" button when many suggestions', () => {
        render(<HashtagManager {...defaultProps} platform="instagram" showSuggestions={true} />);

        const showMoreButton = screen.getByText(/Show .* more/i);
        expect(showMoreButton).toBeInTheDocument();
    });

    it('should expand suggestions when "Show more" clicked', () => {
        render(<HashtagManager {...defaultProps} platform="instagram" showSuggestions={true} />);

        const showMoreButton = screen.getByText(/Show .* more/i);
        const initialSuggestions = screen.getAllByText(/#\w+/).length;

        fireEvent.click(showMoreButton);

        const expandedSuggestions = screen.getAllByText(/#\w+/).length;
        expect(expandedSuggestions).toBeGreaterThan(initialSuggestions);
    });

    it('should show character count', () => {
        const hashtags = ['#cannabis', '#weed'];
        render(<HashtagManager {...defaultProps} hashtags={hashtags} />);

        const charCount = '#cannabis #weed'.length;
        expect(screen.getByText(`Total characters: ${charCount}`)).toBeInTheDocument();
    });

    it('should warn about Instagram character limit', () => {
        const longHashtags = Array.from({ length: 100 }, (_, i) => `#verylonghashtag${i}`);
        render(<HashtagManager {...defaultProps} hashtags={longHashtags} platform="instagram" />);

        expect(screen.getByText(/Exceeds Instagram's 2,200 character limit/i)).toBeInTheDocument();
    });

    it('should be read-only when readonly prop is true', () => {
        const hashtags = ['#cannabis'];
        render(<HashtagManager {...defaultProps} hashtags={hashtags} readonly={true} />);

        expect(screen.queryByPlaceholderText(/Add hashtag/i)).not.toBeInTheDocument();
        expect(screen.queryByText('Add')).not.toBeInTheDocument();

        // Remove buttons should not be present
        const badges = screen.getByText('#cannabis').parentElement;
        expect(badges?.querySelector('button')).not.toBeInTheDocument();
    });

    it('should clear input after adding hashtag', () => {
        render(<HashtagManager {...defaultProps} />);

        const input = screen.getByPlaceholderText(/Add hashtag/i) as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'cannabis' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(input.value).toBe('');
    });

    it('should disable Add button when input is empty', () => {
        render(<HashtagManager {...defaultProps} />);

        const addButton = screen.getByText('Add');
        expect(addButton).toBeDisabled();
    });

    it('should enable Add button when input has text', () => {
        render(<HashtagManager {...defaultProps} />);

        const input = screen.getByPlaceholderText(/Add hashtag/i);
        fireEvent.change(input, { target: { value: 'cannabis' } });

        const addButton = screen.getByText('Add');
        expect(addButton).not.toBeDisabled();
    });

    it('should show AI generation button (disabled)', () => {
        render(<HashtagManager {...defaultProps} />);

        const aiButton = screen.getByText(/Generate AI Hashtags/i);
        expect(aiButton).toBeInTheDocument();
        expect(aiButton).toBeDisabled();
    });

    it('should apply custom className', () => {
        const { container } = render(<HashtagManager {...defaultProps} className="custom-class" />);

        expect(container.firstChild).toHaveClass('custom-class');
    });
});
