/**
 * Hero Section Tests
 *
 * Tests for the Academy hero section component.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeroSection } from '../hero-section';

// Mock framer-motion to render children without animation
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...filterMotionProps(props)}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...filterMotionProps(props)}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...filterMotionProps(props)}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Filter out framer-motion-specific props that aren't valid HTML
function filterMotionProps(props: Record<string, any>) {
  const {
    initial, animate, exit, variants, whileHover, whileInView,
    viewport, transition, whileTap, layout, ...rest
  } = props;
  return rest;
}

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe('HeroSection', () => {
  const defaultProps = {
    totalResources: 15,
    remaining: 3,
    hasEmail: false,
    onStartLearning: jest.fn(),
    onBookDemo: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the title with "AI Academy"', () => {
      render(<HeroSection {...defaultProps} />);

      expect(screen.getByText('AI Academy')).toBeInTheDocument();
      expect(screen.getAllByText(/Cannabis Marketing/).length).toBeGreaterThanOrEqual(1);
    });

    it('should render the subtitle', () => {
      render(<HeroSection {...defaultProps} />);

      expect(
        screen.getByText(/Master AI-powered cannabis marketing in 12 episodes/)
      ).toBeInTheDocument();
    });

    it('should render the "Start Learning Free" button', () => {
      render(<HeroSection {...defaultProps} />);

      expect(screen.getByText('Start Learning Free')).toBeInTheDocument();
    });

    it('should render the "Book a Demo" button', () => {
      render(<HeroSection {...defaultProps} />);

      expect(screen.getByText('Book a Demo')).toBeInTheDocument();
    });

    it('should render stat counters', () => {
      render(<HeroSection {...defaultProps} />);

      expect(screen.getByText('Episodes')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Resources')).toBeInTheDocument();
      expect(screen.getByText('Agent Tracks')).toBeInTheDocument();
    });

    it('should show resource count from props', () => {
      render(<HeroSection {...defaultProps} totalResources={20} />);

      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('should render floating agent images', () => {
      render(<HeroSection {...defaultProps} />);

      const smokeyImg = screen.getByAltText('Smokey');
      const popsImg = screen.getByAltText('Pops');
      const ezalImg = screen.getByAltText('Ezal');

      expect(smokeyImg).toHaveAttribute('src', '/assets/agents/smokey-main.png');
      expect(popsImg).toHaveAttribute('src', '/assets/agents/pops-main.png');
      expect(ezalImg).toHaveAttribute('src', '/assets/agents/ezal-main.png');
    });
  });

  describe('Usage counter', () => {
    it('should show remaining videos when user has no email', () => {
      render(<HeroSection {...defaultProps} remaining={3} hasEmail={false} />);

      expect(screen.getByText('3 free videos remaining')).toBeInTheDocument();
    });

    it('should show singular "video" when remaining is 1', () => {
      render(<HeroSection {...defaultProps} remaining={1} hasEmail={false} />);

      expect(screen.getByText('1 free video remaining')).toBeInTheDocument();
    });

    it('should hide usage counter when user has email', () => {
      render(<HeroSection {...defaultProps} hasEmail={true} />);

      expect(screen.queryByText(/free video/)).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onStartLearning when "Start Learning Free" is clicked', () => {
      render(<HeroSection {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Learning Free'));
      expect(defaultProps.onStartLearning).toHaveBeenCalledTimes(1);
    });

    it('should call onBookDemo when "Book a Demo" is clicked', () => {
      render(<HeroSection {...defaultProps} />);

      fireEvent.click(screen.getByText('Book a Demo'));
      expect(defaultProps.onBookDemo).toHaveBeenCalledTimes(1);
    });
  });
});
