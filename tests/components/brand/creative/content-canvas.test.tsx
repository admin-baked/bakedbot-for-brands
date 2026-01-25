import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContentCanvas } from '@/components/brand/creative/content-canvas';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Sparkles: () => <div data-testid="icon-sparkles" />,
    Wand2: () => <div data-testid="icon-wand" />,
    RefreshCw: () => <div data-testid="icon-refresh" />,
    MoreHorizontal: () => <div data-testid="icon-more" />,
    Loader2: () => <div data-testid="icon-loader" />,
    ImageIcon: () => <div data-testid="icon-image" />,
    Type: () => <div data-testid="icon-type" />,
    Maximize2: () => <div data-testid="icon-maximize" />,
    Copy: () => <div data-testid="icon-copy" />,
    Download: () => <div data-testid="icon-download" />,
    Instagram: () => <div data-testid="icon-instagram" />,
    Video: () => <div data-testid="icon-video" />,
    Linkedin: () => <div data-testid="icon-linkedin" />,
    ChevronDown: () => <div data-testid="icon-chevron-down" />,
    Check: () => <div data-testid="icon-check" />,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Select components to avoid rendering issues with Radix
jest.mock('@/components/ui/select', () => ({
    Select: ({ children, value, onValueChange }: any) => (
        <div data-testid="select" data-value={value} onClick={() => onValueChange?.('instagram')}>
            {children}
        </div>
    ),
    SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
    SelectItem: ({ children, value }: any) => (
        <div data-testid={`select-item-${value}`}>{children}</div>
    ),
    SelectTrigger: ({ children }: any) => <button data-testid="select-trigger">{children}</button>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder || 'Select'}</span>,
}));

describe('ContentCanvas', () => {
    const defaultProps = {
        onGenerate: jest.fn(),
        isGenerating: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders panel title', () => {
            render(<ContentCanvas {...defaultProps} />);
            expect(screen.getByText('Content Canvas')).toBeInTheDocument();
        });

        it('renders agent indicator badge', () => {
            render(<ContentCanvas {...defaultProps} />);
            expect(screen.getByText('Craig + Nano Banana')).toBeInTheDocument();
        });

        it('renders prompt textarea', () => {
            render(<ContentCanvas {...defaultProps} />);
            expect(
                screen.getByPlaceholderText(/Describe the content you want to create/)
            ).toBeInTheDocument();
        });

        it('renders Generate button', () => {
            render(<ContentCanvas {...defaultProps} />);
            expect(screen.getByText('Generate')).toBeInTheDocument();
        });
    });

    describe('Platform Selection', () => {
        it('renders platform selector', () => {
            render(<ContentCanvas {...defaultProps} />);
            // Default platform is Instagram
            expect(screen.getByTestId('icon-instagram')).toBeInTheDocument();
        });
    });

    describe('Style Selection', () => {
        it('renders style selector with default Professional', () => {
            render(<ContentCanvas {...defaultProps} />);
            expect(screen.getByText('Professional')).toBeInTheDocument();
        });
    });

    describe('Generate Functionality', () => {
        it('disables Generate button when prompt is empty', () => {
            render(<ContentCanvas {...defaultProps} />);
            const generateBtn = screen.getByText('Generate').closest('button');
            expect(generateBtn).toBeDisabled();
        });

        it('enables Generate button when prompt has text', () => {
            render(<ContentCanvas {...defaultProps} />);
            const textarea = screen.getByPlaceholderText(/Describe the content/);
            fireEvent.change(textarea, { target: { value: 'Create a promo post' } });

            const generateBtn = screen.getByText('Generate').closest('button');
            expect(generateBtn).not.toBeDisabled();
        });

        it('calls onGenerate with prompt and options', () => {
            render(<ContentCanvas {...defaultProps} />);
            const textarea = screen.getByPlaceholderText(/Describe the content/);
            fireEvent.change(textarea, { target: { value: 'Create a promo post' } });
            fireEvent.click(screen.getByText('Generate'));

            expect(defaultProps.onGenerate).toHaveBeenCalledWith(
                'Create a promo post',
                expect.objectContaining({
                    platform: 'instagram',
                    style: 'professional',
                    mediaType: 'image',
                })
            );
        });

        it('shows loading state when generating', () => {
            render(<ContentCanvas {...defaultProps} isGenerating={true} />);
            expect(screen.getByText('Generating...')).toBeInTheDocument();
        });
    });

    describe('Generated Content Display', () => {
        it('displays generated image', () => {
            render(
                <ContentCanvas
                    {...defaultProps}
                    generatedImageUrl="https://example.com/image.jpg"
                />
            );
            const img = screen.getByRole('img');
            expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
        });

        it('displays generated caption', () => {
            render(
                <ContentCanvas
                    {...defaultProps}
                    generatedCaption="This is a test caption #test"
                />
            );
            expect(screen.getByText('This is a test caption #test')).toBeInTheDocument();
        });

        it('shows regenerate button when content exists', () => {
            render(
                <ContentCanvas
                    {...defaultProps}
                    generatedImageUrl="https://example.com/image.jpg"
                />
            );
            expect(screen.getByText('Regenerate')).toBeInTheDocument();
        });
    });

    describe('Empty State', () => {
        it('shows empty state when no content', () => {
            render(<ContentCanvas {...defaultProps} />);
            expect(screen.getByText('No content yet')).toBeInTheDocument();
            expect(
                screen.getByText('Describe what you want to create and click Generate')
            ).toBeInTheDocument();
        });
    });

    describe('Loading State', () => {
        it('shows generation in progress message', () => {
            render(<ContentCanvas {...defaultProps} isGenerating={true} />);
            expect(screen.getByText('Craig & Nano Banana are creating...')).toBeInTheDocument();
        });
    });
});
