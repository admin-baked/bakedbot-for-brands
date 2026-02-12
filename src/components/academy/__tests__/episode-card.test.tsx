/**
 * Episode Card Tests
 *
 * Tests for the redesigned episode card component with
 * agent-themed thumbnails and Framer Motion animations.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EpisodeCard } from '../episode-card';
import type { AcademyEpisode } from '@/types/academy';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, variants, whileHover, whileInView, viewport, transition, whileTap, layout, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...rest }: any) => <img src={src} alt={alt} data-testid={`image-${alt}`} />,
}));

describe('EpisodeCard', () => {
  const mockEpisode: AcademyEpisode = {
    id: 'ep2-smokey-recs',
    episodeNumber: 2,
    title: 'AI-Powered Product Recommendations',
    description: 'Build a smart budtender experience for your customers',
    track: 'smokey',
    youtubeId: 'abc123',
    duration: 1920, // 32 minutes
    learningObjectives: [
      'Understand terpene-based matching',
      'Configure product recommendation rules',
      'Measure recommendation effectiveness',
    ],
    resources: [],
    requiresEmail: false,
  };

  const placeholderEpisode: AcademyEpisode = {
    ...mockEpisode,
    id: 'ep12-capstone',
    episodeNumber: 12,
    title: 'Capstone Project',
    youtubeId: 'PLACEHOLDER',
    track: 'general',
  };

  const mockOnWatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render episode title', () => {
      render(<EpisodeCard episode={mockEpisode} onWatch={mockOnWatch} />);

      expect(screen.getByText('AI-Powered Product Recommendations')).toBeInTheDocument();
    });

    it('should render episode description', () => {
      render(<EpisodeCard episode={mockEpisode} onWatch={mockOnWatch} />);

      expect(screen.getByText(/Build a smart budtender/)).toBeInTheDocument();
    });

    it('should display episode number badge', () => {
      render(<EpisodeCard episode={mockEpisode} onWatch={mockOnWatch} />);

      expect(screen.getByText('Ep 2')).toBeInTheDocument();
    });

    it('should display duration in minutes', () => {
      render(<EpisodeCard episode={mockEpisode} onWatch={mockOnWatch} />);

      expect(screen.getByText('32 min')).toBeInTheDocument();
    });

    it('should display track indicator for agent-specific episodes', () => {
      render(<EpisodeCard episode={mockEpisode} onWatch={mockOnWatch} />);

      // Track indicator shows agent name from AGENT_TRACKS
      expect(screen.getByText(/Smokey/)).toBeInTheDocument();
    });

    it('should render learning objectives (max 2 shown)', () => {
      render(<EpisodeCard episode={mockEpisode} onWatch={mockOnWatch} />);

      expect(screen.getByText('Understand terpene-based matching')).toBeInTheDocument();
      expect(screen.getByText('Configure product recommendation rules')).toBeInTheDocument();
      // Text is split across nodes: "+ " + "1" + " more"
      expect(screen.getByText((_, element) => {
        return element?.tagName === 'LI' && element?.textContent === '+ 1 more';
      })).toBeInTheDocument();
    });
  });

  describe('Thumbnail rendering', () => {
    it('should render Gemini thumbnail when thumbnailUrl is provided', () => {
      render(
        <EpisodeCard
          episode={mockEpisode}
          onWatch={mockOnWatch}
          thumbnailUrl="https://storage.googleapis.com/thumb.png"
        />
      );

      const img = screen.getByTestId(`image-${mockEpisode.title}`);
      expect(img).toHaveAttribute('src', 'https://storage.googleapis.com/thumb.png');
    });

    it('should render agent image when no thumbnailUrl and agent has image', () => {
      render(<EpisodeCard episode={mockEpisode} onWatch={mockOnWatch} />);

      // smokey has an image, so it should render an img with the agent track as alt
      const img = screen.getByTestId('image-smokey');
      expect(img).toHaveAttribute('src', '/assets/agents/smokey-main.png');
    });
  });

  describe('PLACEHOLDER (Coming Soon) episodes', () => {
    it('should show "Coming Soon" text', () => {
      render(<EpisodeCard episode={placeholderEpisode} onWatch={mockOnWatch} />);

      // Appears in both overlay and button
      const elements = screen.getAllByText('Coming Soon');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('should have disabled watch button', () => {
      render(<EpisodeCard episode={placeholderEpisode} onWatch={mockOnWatch} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should prevent interaction via disabled button attribute', () => {
      render(<EpisodeCard episode={placeholderEpisode} onWatch={mockOnWatch} />);

      // Button is disabled so users cannot interact with it in a real browser
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('disabled');
    });
  });

  describe('Locked episodes', () => {
    it('should show "Email Required" button when locked', () => {
      render(
        <EpisodeCard episode={mockEpisode} onWatch={mockOnWatch} isLocked={true} />
      );

      expect(screen.getByText('Email Required')).toBeInTheDocument();
    });

    it('should not call onWatch when card is clicked while locked', () => {
      render(
        <EpisodeCard episode={mockEpisode} onWatch={mockOnWatch} isLocked={true} />
      );

      // Click the card (the outer container)
      const card = screen.getByText('AI-Powered Product Recommendations').closest('[class*="cursor"]');
      if (card) fireEvent.click(card);
      // onWatch should still be called from button click propagation, but card click should not
      expect(mockOnWatch).not.toHaveBeenCalled();
    });
  });

  describe('Watched episodes', () => {
    it('should show "Watched" badge when hasWatched is true', () => {
      render(
        <EpisodeCard episode={mockEpisode} onWatch={mockOnWatch} hasWatched={true} />
      );

      expect(screen.getByText('Watched')).toBeInTheDocument();
    });

    it('should not show "Watched" badge when locked', () => {
      render(
        <EpisodeCard
          episode={mockEpisode}
          onWatch={mockOnWatch}
          hasWatched={true}
          isLocked={true}
        />
      );

      expect(screen.queryByText('Watched')).not.toBeInTheDocument();
    });
  });

  describe('Watch interaction', () => {
    it('should show "Watch Now" button for available episodes', () => {
      render(<EpisodeCard episode={mockEpisode} onWatch={mockOnWatch} />);

      expect(screen.getByText('Watch Now')).toBeInTheDocument();
    });

    it('should call onWatch with episode when button is clicked', () => {
      render(<EpisodeCard episode={mockEpisode} onWatch={mockOnWatch} />);

      fireEvent.click(screen.getByText('Watch Now'));
      expect(mockOnWatch).toHaveBeenCalledWith(mockEpisode);
    });

    it('should call onWatch when card area is clicked', () => {
      render(<EpisodeCard episode={mockEpisode} onWatch={mockOnWatch} />);

      // Click on the title text (inside the card)
      fireEvent.click(screen.getByText('AI-Powered Product Recommendations'));
      expect(mockOnWatch).toHaveBeenCalledWith(mockEpisode);
    });
  });
});
