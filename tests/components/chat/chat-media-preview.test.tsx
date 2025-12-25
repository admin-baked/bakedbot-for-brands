/**
 * Unit Tests: ChatMediaPreview Component
 * 
 * Tests for the inline media preview component used in Agent Chat
 * to display generated images and videos from creative tools.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatMediaPreview, extractMediaFromToolResponse } from '@/components/chat/chat-media-preview';

// Mock window.open and URL methods
const mockOpen = jest.fn();
const mockCreateObjectURL = jest.fn(() => 'blob:test-url');
const mockRevokeObjectURL = jest.fn();

beforeAll(() => {
    global.window.open = mockOpen;
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('ChatMediaPreview', () => {
    describe('Image Preview', () => {
        it('should render an image with correct src', () => {
            render(
                <ChatMediaPreview 
                    type="image" 
                    url="https://example.com/generated-image.png" 
                />
            );
            
            const img = screen.getByTestId('image-preview');
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute('src', 'https://example.com/generated-image.png');
        });

        it('should show prompt as alt text', () => {
            render(
                <ChatMediaPreview 
                    type="image" 
                    url="https://example.com/image.png" 
                    prompt="A vibrant cannabis flower"
                />
            );
            
            const img = screen.getByTestId('image-preview');
            expect(img).toHaveAttribute('alt', 'A vibrant cannabis flower');
        });

        it('should display Image badge', () => {
            render(
                <ChatMediaPreview 
                    type="image" 
                    url="https://example.com/image.png" 
                />
            );
            
            expect(screen.getByText('Image')).toBeInTheDocument();
        });
    });

    describe('Video Preview', () => {
        it('should render a video player with correct src', () => {
            render(
                <ChatMediaPreview 
                    type="video" 
                    url="https://example.com/generated-video.mp4" 
                />
            );
            
            const video = screen.getByTestId('video-player');
            expect(video).toBeInTheDocument();
            expect(video).toHaveAttribute('src', 'https://example.com/generated-video.mp4');
        });

        it('should show duration badge for videos', () => {
            render(
                <ChatMediaPreview 
                    type="video" 
                    url="https://example.com/video.mp4" 
                    duration={10}
                />
            );
            
            expect(screen.getByText('10s')).toBeInTheDocument();
        });

        it('should have controls attribute on video', () => {
            render(
                <ChatMediaPreview 
                    type="video" 
                    url="https://example.com/video.mp4" 
                />
            );
            
            const video = screen.getByTestId('video-player');
            expect(video).toHaveAttribute('controls');
        });
    });

    describe('Loading State', () => {
        it('should show loading spinner when isLoading is true', () => {
            render(
                <ChatMediaPreview 
                    type="image" 
                    url="" 
                    isLoading={true}
                />
            );
            
            expect(screen.getByTestId('media-preview-loading')).toBeInTheDocument();
            expect(screen.getByText('Generating image...')).toBeInTheDocument();
        });

        it('should show prompt while loading', () => {
            render(
                <ChatMediaPreview 
                    type="video" 
                    url="" 
                    isLoading={true}
                    prompt="A product showcase video"
                />
            );
            
            expect(screen.getByText('"A product showcase video"')).toBeInTheDocument();
        });
    });

    describe('Actions', () => {
        it('should have download button', () => {
            render(
                <ChatMediaPreview 
                    type="image" 
                    url="https://example.com/image.png" 
                />
            );
            
            expect(screen.getByTestId('download-button')).toBeInTheDocument();
        });

        it('should have open in new tab button', () => {
            render(
                <ChatMediaPreview 
                    type="image" 
                    url="https://example.com/image.png" 
                />
            );
            
            expect(screen.getByTestId('open-button')).toBeInTheDocument();
        });

        it('should open URL in new tab when open button clicked', () => {
            render(
                <ChatMediaPreview 
                    type="image" 
                    url="https://example.com/image.png" 
                />
            );
            
            fireEvent.click(screen.getByTestId('open-button'));
            expect(mockOpen).toHaveBeenCalledWith('https://example.com/image.png', '_blank');
        });
    });

    describe('Metadata Display', () => {
        it('should display model name when provided', () => {
            render(
                <ChatMediaPreview 
                    type="image" 
                    url="https://example.com/image.png" 
                    model="gemini-3-pro-image-preview"
                />
            );
            
            expect(screen.getByText('Generated with gemini-3-pro-image-preview')).toBeInTheDocument();
        });

        it('should display prompt caption when provided', () => {
            render(
                <ChatMediaPreview 
                    type="video" 
                    url="https://example.com/video.mp4" 
                    prompt="A cinematic product reveal"
                />
            );
            
            expect(screen.getByText('A cinematic product reveal')).toBeInTheDocument();
        });
    });
});

describe('extractMediaFromToolResponse', () => {
    it('should return null for empty data', () => {
        expect(extractMediaFromToolResponse(null)).toBeNull();
        expect(extractMediaFromToolResponse(undefined)).toBeNull();
        expect(extractMediaFromToolResponse({})).toBeNull();
    });

    it('should extract video data correctly', () => {
        const data = {
            videoUrl: 'https://example.com/video.mp4',
            prompt: 'Product showcase',
            duration: 10,
            model: 'veo-3.1-generate-preview'
        };

        const result = extractMediaFromToolResponse(data);
        
        expect(result).toEqual({
            type: 'video',
            url: 'https://example.com/video.mp4',
            prompt: 'Product showcase',
            duration: 10,
            model: 'veo-3.1-generate-preview'
        });
    });

    it('should extract image data correctly', () => {
        const data = {
            imageUrl: 'https://example.com/image.png',
            prompt: 'Cannabis product image',
            model: 'gemini-3-pro-image-preview'
        };

        const result = extractMediaFromToolResponse(data);
        
        expect(result).toEqual({
            type: 'image',
            url: 'https://example.com/image.png',
            prompt: 'Cannabis product image',
            model: 'gemini-3-pro-image-preview'
        });
    });

    it('should prioritize video over image if both present', () => {
        const data = {
            videoUrl: 'https://example.com/video.mp4',
            imageUrl: 'https://example.com/image.png'
        };

        const result = extractMediaFromToolResponse(data);
        expect(result?.type).toBe('video');
    });
});

describe('Accessibility', () => {
    it('should have proper data-testid attributes for testing', () => {
        render(
            <ChatMediaPreview 
                type="image" 
                url="https://example.com/image.png" 
            />
        );
        
        expect(screen.getByTestId('media-preview')).toBeInTheDocument();
        expect(screen.getByTestId('image-preview')).toBeInTheDocument();
        expect(screen.getByTestId('download-button')).toBeInTheDocument();
        expect(screen.getByTestId('open-button')).toBeInTheDocument();
    });
});
