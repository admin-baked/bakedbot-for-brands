import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelpSearchEnhanced from '../help-search-enhanced';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('HelpSearchEnhanced seeded search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('seeds the search input and triggers results from the initial query', () => {
    render(<HelpSearchEnhanced initialQuery="inbox" />);

    expect(screen.getByPlaceholderText(/Search help articles/i)).toHaveValue('inbox');

    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(screen.getByText(/Navigating the Inbox/i)).toBeInTheDocument();
  });

  it('preselects the provided category', () => {
    render(<HelpSearchEnhanced initialCategory="getting-started" />);
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }));

    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(screen.getByDisplayValue('Getting Started')).toBeInTheDocument();
  });
});
