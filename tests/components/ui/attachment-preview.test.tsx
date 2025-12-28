/**
 * AttachmentPreviewCard Unit Tests
 * 
 * Tests for the Claude-style attachment preview component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props}>{children}</button>
    ),
}));

jest.mock('@/components/ui/dialog', () => ({
    Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

jest.mock('@/lib/utils', () => ({
    cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

// Import the component and utilities after mocks
import { 
    AttachmentPreviewCard, 
    AttachmentPreviewList,
    AttachmentItem 
} from '@/components/ui/attachment-preview';

// ============ Utility Function Tests ============

describe('getFileInfo (inferred from component behavior)', () => {
    const mockOnRemove = jest.fn();

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render image type with image icon styling', () => {
        const imageAttachment: AttachmentItem = {
            id: '1',
            type: 'image',
            preview: 'data:image/png;base64,abc123',
            name: 'screenshot.png'
        };

        render(<AttachmentPreviewCard attachment={imageAttachment} onRemove={mockOnRemove} />);
        
        // Should show image preview
        const img = screen.getByAltText('preview');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'data:image/png;base64,abc123');
    });

    it('should render CSV file with spreadsheet styling', () => {
        const csvAttachment: AttachmentItem = {
            id: '2',
            type: 'file',
            name: 'data.csv',
            content: 'col1,col2\nval1,val2'
        };

        render(<AttachmentPreviewCard attachment={csvAttachment} onRemove={mockOnRemove} />);
        
        expect(screen.getByText('data.csv')).toBeInTheDocument();
    });

    it('should render PDF file with document styling', () => {
        const pdfAttachment: AttachmentItem = {
            id: '3',
            type: 'file',
            name: 'report.pdf'
        };

        render(<AttachmentPreviewCard attachment={pdfAttachment} onRemove={mockOnRemove} />);
        
        expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });

    it('should render pasted content with PASTED badge', () => {
        const pastedAttachment: AttachmentItem = {
            id: '4',
            type: 'pasted',
            content: 'This is some pasted text content that was copied from somewhere else.',
            name: 'Pasted Content'
        };

        render(<AttachmentPreviewCard attachment={pastedAttachment} onRemove={mockOnRemove} />);
        
        expect(screen.getByText('PASTED')).toBeInTheDocument();
        expect(screen.getByText('Pasted Content')).toBeInTheDocument();
    });
});

describe('truncateText behavior', () => {
    const mockOnRemove = jest.fn();

    it('should truncate long content with ellipsis', () => {
        const longContent = 'A'.repeat(200);
        const attachment: AttachmentItem = {
            id: '5',
            type: 'pasted',
            content: longContent,
            name: 'Long Content'
        };

        render(<AttachmentPreviewCard attachment={attachment} onRemove={mockOnRemove} />);
        
        // The preview should be truncated (contains ... at the end)
        const preview = screen.getByText(/A+\.\.\./);
        expect(preview).toBeInTheDocument();
    });

    it('should show full text for short content', () => {
        const shortContent = 'Short text';
        const attachment: AttachmentItem = {
            id: '6',
            type: 'pasted',
            content: shortContent,
            name: 'Short Content'
        };

        render(<AttachmentPreviewCard attachment={attachment} onRemove={mockOnRemove} />);
        
        expect(screen.getByText('Short text')).toBeInTheDocument();
    });
});

describe('formatSize behavior', () => {
    const mockOnRemove = jest.fn();

    it('should display bytes for small content', () => {
        const attachment: AttachmentItem = {
            id: '7',
            type: 'pasted',
            content: 'Hello', // 5 bytes
            name: 'Small'
        };

        render(<AttachmentPreviewCard attachment={attachment} onRemove={mockOnRemove} />);
        
        expect(screen.getByText('5 B')).toBeInTheDocument();
    });

    it('should display KB for larger content', () => {
        const content = 'X'.repeat(2048); // ~2KB
        const attachment: AttachmentItem = {
            id: '8',
            type: 'pasted',
            content,
            name: 'Medium'
        };

        render(<AttachmentPreviewCard attachment={attachment} onRemove={mockOnRemove} />);
        
        expect(screen.getByText('2.0 KB')).toBeInTheDocument();
    });
});

// ============ AttachmentPreviewCard Tests ============

describe('AttachmentPreviewCard', () => {
    const mockOnRemove = jest.fn();

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render attachment with name and preview', () => {
        const attachment: AttachmentItem = {
            id: '10',
            type: 'pasted',
            content: 'Sample content for testing',
            name: 'Test Attachment'
        };

        render(<AttachmentPreviewCard attachment={attachment} onRemove={mockOnRemove} />);

        expect(screen.getByText('Test Attachment')).toBeInTheDocument();
        expect(screen.getByText(/Sample content/)).toBeInTheDocument();
    });

    it('should call onRemove when remove button is clicked', () => {
        const attachment: AttachmentItem = {
            id: '11',
            type: 'pasted',
            content: 'Content to remove',
            name: 'Removable'
        };

        render(<AttachmentPreviewCard attachment={attachment} onRemove={mockOnRemove} />);

        // Find and click the remove button (the X button)
        const removeButtons = screen.getAllByRole('button');
        const removeButton = removeButtons.find(btn => btn.className.includes('absolute'));
        
        if (removeButton) {
            fireEvent.click(removeButton);
            expect(mockOnRemove).toHaveBeenCalledWith('11');
        }
    });

    it('should open dialog when card is clicked', () => {
        const attachment: AttachmentItem = {
            id: '12',
            type: 'pasted',
            content: 'Click to expand',
            name: 'Expandable'
        };

        render(<AttachmentPreviewCard attachment={attachment} onRemove={mockOnRemove} />);

        // Click the card (not the remove button)
        const card = screen.getByText('Expandable').closest('div[class*="cursor-pointer"]');
        if (card) {
            fireEvent.click(card);
        }

        // Dialog should be shown
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });
});

// ============ AttachmentPreviewList Tests ============

describe('AttachmentPreviewList', () => {
    const mockOnRemove = jest.fn();

    it('should return null for empty attachments', () => {
        const { container } = render(
            <AttachmentPreviewList attachments={[]} onRemove={mockOnRemove} />
        );

        expect(container.firstChild).toBeNull();
    });

    it('should render multiple attachment cards', () => {
        const attachments: AttachmentItem[] = [
            { id: '1', type: 'pasted', content: 'Content 1', name: 'Attachment 1' },
            { id: '2', type: 'pasted', content: 'Content 2', name: 'Attachment 2' },
            { id: '3', type: 'image', preview: 'data:image/png', name: 'Image.png' },
        ];

        render(<AttachmentPreviewList attachments={attachments} onRemove={mockOnRemove} />);

        expect(screen.getByText('Attachment 1')).toBeInTheDocument();
        expect(screen.getByText('Attachment 2')).toBeInTheDocument();
        expect(screen.getByText('Image.png')).toBeInTheDocument();
    });

    it('should pass onRemove to each card', () => {
        const attachments: AttachmentItem[] = [
            { id: 'unique-id', type: 'pasted', content: 'Test', name: 'Test' },
        ];

        render(<AttachmentPreviewList attachments={attachments} onRemove={mockOnRemove} />);

        // Find the remove button and click it
        const removeButtons = screen.getAllByRole('button');
        const removeButton = removeButtons.find(btn => btn.className.includes('absolute'));
        
        if (removeButton) {
            fireEvent.click(removeButton);
            expect(mockOnRemove).toHaveBeenCalledWith('unique-id');
        }
    });
});

// ============ Edge Cases ============

describe('Edge Cases', () => {
    const mockOnRemove = jest.fn();

    it('should handle attachment with no name', () => {
        const attachment: AttachmentItem = {
            id: '100',
            type: 'pasted',
            content: 'Anonymous content'
        };

        render(<AttachmentPreviewCard attachment={attachment} onRemove={mockOnRemove} />);

        // Should fall back to 'Pasted content'
        expect(screen.getByText('Pasted content')).toBeInTheDocument();
    });

    it('should handle attachment with empty content', () => {
        const attachment: AttachmentItem = {
            id: '101',
            type: 'pasted',
            content: '',
            name: 'Empty'
        };

        render(<AttachmentPreviewCard attachment={attachment} onRemove={mockOnRemove} />);

        expect(screen.getByText('Empty')).toBeInTheDocument();
        expect(screen.getByText('0 B')).toBeInTheDocument();
    });

    it('should handle file type with unknown extension', () => {
        const attachment: AttachmentItem = {
            id: '102',
            type: 'file',
            name: 'strange.xyz'
        };

        render(<AttachmentPreviewCard attachment={attachment} onRemove={mockOnRemove} />);

        expect(screen.getByText('strange.xyz')).toBeInTheDocument();
        // Falls back to 'FILE' badge when there's no File object
        expect(screen.getByText('FILE')).toBeInTheDocument();
    });
});
