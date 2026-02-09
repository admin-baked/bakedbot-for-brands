/**
 * Social Share Buttons Tests
 *
 * Tests for the social sharing component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SocialShareButtons } from '../social-share-buttons';
import type { AcademyEpisode } from '@/types/academy';

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock alert
const mockAlert = jest.fn();
window.alert = mockAlert;

describe('SocialShareButtons', () => {
  const mockEpisode: AcademyEpisode = {
    id: 'ep1-intro',
    episodeNumber: 1,
    title: 'What Is AI Marketing for Cannabis',
    description: 'Learn the fundamentals of AI-powered marketing',
    track: 'general',
    youtubeId: 'PLACEHOLDER',
    duration: 720,
    learningObjectives: ['Understanding AI basics'],
    resources: [],
    requiresEmail: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all share buttons', () => {
      render(<SocialShareButtons episode={mockEpisode} />);

      expect(screen.getByTitle('Share on Twitter')).toBeInTheDocument();
      expect(screen.getByTitle('Share on LinkedIn')).toBeInTheDocument();
      expect(screen.getByTitle('Share via Email')).toBeInTheDocument();
      expect(screen.getByTitle('Copy Link')).toBeInTheDocument();
    });

    it('should display share label', () => {
      render(<SocialShareButtons episode={mockEpisode} />);

      expect(screen.getByText('Share:')).toBeInTheDocument();
    });

    it('should show button labels on larger screens', () => {
      render(<SocialShareButtons episode={mockEpisode} />);

      // These are hidden on mobile (sm:inline class)
      expect(screen.getByText('Twitter')).toBeInTheDocument();
      expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });
  });

  describe('Twitter Share', () => {
    it('should open Twitter share dialog with correct URL', () => {
      render(<SocialShareButtons episode={mockEpisode} />);

      fireEvent.click(screen.getByTitle('Share on Twitter'));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('twitter.com/intent/tweet'),
        '_blank',
        'width=550,height=420'
      );
    });

    it('should include episode title in share text', () => {
      render(<SocialShareButtons episode={mockEpisode} />);

      fireEvent.click(screen.getByTitle('Share on Twitter'));

      const callArg = mockWindowOpen.mock.calls[0][0];
      expect(callArg).toContain(encodeURIComponent(mockEpisode.title));
    });

    it('should include BakedBotAI handle', () => {
      render(<SocialShareButtons episode={mockEpisode} />);

      fireEvent.click(screen.getByTitle('Share on Twitter'));

      const callArg = mockWindowOpen.mock.calls[0][0];
      expect(callArg).toContain('via=BakedBotAI');
    });

    it('should include UTM tracking parameters', () => {
      render(<SocialShareButtons episode={mockEpisode} />);

      fireEvent.click(screen.getByTitle('Share on Twitter'));

      const callArg = mockWindowOpen.mock.calls[0][0];
      // UTM params are URL-encoded within the share URL
      expect(decodeURIComponent(callArg)).toContain('utm_source=social');
      expect(decodeURIComponent(callArg)).toContain('utm_medium=share');
    });
  });

  describe('LinkedIn Share', () => {
    it('should open LinkedIn share dialog', () => {
      render(<SocialShareButtons episode={mockEpisode} />);

      fireEvent.click(screen.getByTitle('Share on LinkedIn'));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('linkedin.com/sharing/share-offsite'),
        '_blank',
        'width=550,height=550'
      );
    });

    it('should include academy URL with episode ID', () => {
      render(<SocialShareButtons episode={mockEpisode} />);

      fireEvent.click(screen.getByTitle('Share on LinkedIn'));

      const callArg = mockWindowOpen.mock.calls[0][0];
      expect(callArg).toContain(encodeURIComponent(`episode=${mockEpisode.id}`));
    });
  });

  describe('Email Share', () => {
    it('should trigger mailto link', () => {
      // Mock window.location.href assignment
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' };

      render(<SocialShareButtons episode={mockEpisode} />);

      fireEvent.click(screen.getByTitle('Share via Email'));

      expect(window.location.href).toContain('mailto:');

      // Restore
      window.location = originalLocation;
    });

    it('should include episode title in subject', () => {
      const originalLocation = window.location;
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' };

      render(<SocialShareButtons episode={mockEpisode} />);

      fireEvent.click(screen.getByTitle('Share via Email'));

      expect(window.location.href).toContain(
        encodeURIComponent(`Check out: ${mockEpisode.title}`)
      );

      window.location = originalLocation;
    });
  });

  describe('Copy Link', () => {
    it('should copy share URL to clipboard', async () => {
      render(<SocialShareButtons episode={mockEpisode} />);

      fireEvent.click(screen.getByTitle('Copy Link'));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('bakedbot.ai/academy')
      );
    });

    it('should show confirmation alert', async () => {
      render(<SocialShareButtons episode={mockEpisode} />);

      fireEvent.click(screen.getByTitle('Copy Link'));

      // Wait for async clipboard operation
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockAlert).toHaveBeenCalledWith('Link copied to clipboard!');
    });

    it('should include episode ID in copied URL', async () => {
      render(<SocialShareButtons episode={mockEpisode} />);

      fireEvent.click(screen.getByTitle('Copy Link'));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining(`episode=${mockEpisode.id}`)
      );
    });

    it('should handle clipboard errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(
        new Error('Clipboard not available')
      );

      render(<SocialShareButtons episode={mockEpisode} />);

      fireEvent.click(screen.getByTitle('Copy Link'));

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to copy link:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('UTM Tracking', () => {
    it('should include social UTM source in all share URLs', () => {
      render(<SocialShareButtons episode={mockEpisode} />);

      // Twitter - UTM params are URL-encoded
      fireEvent.click(screen.getByTitle('Share on Twitter'));
      expect(decodeURIComponent(mockWindowOpen.mock.calls[0][0])).toContain('utm_source=social');

      mockWindowOpen.mockClear();

      // LinkedIn - UTM params are URL-encoded
      fireEvent.click(screen.getByTitle('Share on LinkedIn'));
      expect(decodeURIComponent(mockWindowOpen.mock.calls[0][0])).toContain('utm_source=social');
    });
  });
});
