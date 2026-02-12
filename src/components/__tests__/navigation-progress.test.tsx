/**
 * Tests for NavigationProgress component
 */

import { render, screen, waitFor } from '@testing-library/react';
import { NavigationProgress } from '../navigation-progress';
import { usePathname, useSearchParams } from 'next/navigation';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe('NavigationProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('shows progress bar on initial render', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    render(<NavigationProgress />);

    const progressBar = screen.getByRole('progressbar', { name: 'Page loading' });
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveClass('animate-progress');
  });

  it('hides progress bar after 150ms timeout', async () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    const { container } = render(<NavigationProgress />);

    // Should be visible initially
    let progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();

    // Fast-forward time by 150ms
    jest.advanceTimersByTime(150);

    // Should be hidden after timeout
    await waitFor(() => {
      progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).not.toBeInTheDocument();
    });
  });

  it('shows progress bar when pathname changes', () => {
    const { rerender } = render(<NavigationProgress />);

    // Initially at /dashboard
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    rerender(<NavigationProgress />);
    let progressBar = screen.queryByRole('progressbar');
    expect(progressBar).toBeInTheDocument();

    // Fast-forward to hide
    jest.advanceTimersByTime(150);

    // Navigate to /dashboard/menu
    (usePathname as jest.Mock).mockReturnValue('/dashboard/menu');
    rerender(<NavigationProgress />);

    progressBar = screen.getByRole('progressbar', { name: 'Page loading' });
    expect(progressBar).toBeInTheDocument();
  });

  it('shows progress bar when search params change', () => {
    const { rerender } = render(<NavigationProgress />);

    // Initial state
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    rerender(<NavigationProgress />);
    let progressBar = screen.queryByRole('progressbar');
    expect(progressBar).toBeInTheDocument();

    // Fast-forward to hide
    jest.advanceTimersByTime(150);

    // Change search params
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('?tab=products'));
    rerender(<NavigationProgress />);

    progressBar = screen.getByRole('progressbar', { name: 'Page loading' });
    expect(progressBar).toBeInTheDocument();
  });

  it('applies correct CSS classes for animation', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    render(<NavigationProgress />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('fixed', 'top-0', 'left-0', 'right-0', 'h-1');
    expect(progressBar).toHaveClass('bg-gradient-to-r', 'from-baked-green', 'via-green-400', 'to-baked-green');
    expect(progressBar).toHaveClass('z-50', 'animate-progress');
  });

  it('has shimmer animation element', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    const { container } = render(<NavigationProgress />);

    const shimmerElement = container.querySelector('.animate-shimmer');
    expect(shimmerElement).toBeInTheDocument();
    expect(shimmerElement).toHaveClass('h-full', 'bg-gradient-to-r', 'from-transparent', 'via-white/30', 'to-transparent');
  });

  it('cleans up timeout on unmount', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    const { unmount } = render(<NavigationProgress />);

    // Unmount before timeout completes
    unmount();

    // Fast-forward time
    jest.advanceTimersByTime(150);

    // Should not throw errors (cleanup worked)
    expect(jest.getTimerCount()).toBe(0);
  });
});
