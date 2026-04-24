/**
 * Tests for HeartbeatWidget component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { HeartbeatWidget, generateMockSuggestions, type CreativeSuggestion } from '../heartbeat-widget';

describe('HeartbeatWidget', () => {
  const mockSuggestions: CreativeSuggestion[] = [
    {
      id: 'sug_1',
      type: 'deal',
      priority: 'high',
      title: 'Flash Sale Opportunity',
      description: 'Test description',
      reasoning: 'Test reasoning',
      suggestedTemplates: ['template_1'],
      suggestedPlatforms: ['Instagram'],
      createdAt: new Date(),
    },
    {
      id: 'sug_2',
      type: 'new_product',
      priority: 'medium',
      title: 'New Product Launch',
      description: 'Test description 2',
      reasoning: 'Test reasoning 2',
      suggestedTemplates: ['template_2'],
      suggestedPlatforms: ['Facebook'],
      createdAt: new Date(),
    },
  ];

  const mockHandlers = {
    onCreateFromSuggestion: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all suggestions', () => {
    render(
      <HeartbeatWidget
        suggestions={mockSuggestions}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Flash Sale Opportunity')).toBeInTheDocument();
    expect(screen.getByText('New Product Launch')).toBeInTheDocument();
  });

  it('shows priority badges', () => {
    render(
      <HeartbeatWidget
        suggestions={mockSuggestions}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('1 High Priority')).toBeInTheDocument();
    expect(screen.getByText('1 Medium')).toBeInTheDocument();
  });

  it('dismisses suggestion when X is clicked', () => {
    const { container } = render(
      <HeartbeatWidget
        suggestions={mockSuggestions}
        {...mockHandlers}
      />
    );

    // Dismiss buttons are plain <button> elements (not ShadCN Button)
    // They are the small round buttons with class containing 'rounded-full'
    const dismissButtons = container.querySelectorAll('button.rounded-full');
    expect(dismissButtons.length).toBeGreaterThan(0);
    fireEvent.click(dismissButtons[0]);

    expect(mockHandlers.onDismiss).toHaveBeenCalledWith('sug_1');
  });

  it('filters out dismissed suggestions', () => {
    const suggestionsWithDismissed: CreativeSuggestion[] = [
      { ...mockSuggestions[0] },
      { ...mockSuggestions[1], dismissed: true },
    ];

    render(
      <HeartbeatWidget
        suggestions={suggestionsWithDismissed}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Flash Sale Opportunity')).toBeInTheDocument();
    expect(screen.queryByText('New Product Launch')).not.toBeInTheDocument();
  });

  it('shows empty state when no suggestions', () => {
    render(
      <HeartbeatWidget
        suggestions={[]}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('All Caught Up!')).toBeInTheDocument();
    expect(screen.getByText('No new suggestions right now')).toBeInTheDocument();
  });

  it('displays platform badges', () => {
    render(
      <HeartbeatWidget
        suggestions={mockSuggestions}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
  });

  it('shows expiration date if present', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const suggestionsWithExpiry: CreativeSuggestion[] = [
      { ...mockSuggestions[0], expiresAt: tomorrow },
    ];

    render(
      <HeartbeatWidget
        suggestions={suggestionsWithExpiry}
        {...mockHandlers}
      />
    );

    expect(screen.getByText(/Expires/)).toBeInTheDocument();
  });

  it('applies correct styling for high priority', () => {
    const { container } = render(
      <HeartbeatWidget
        suggestions={[mockSuggestions[0]]}
        {...mockHandlers}
      />
    );

    // The border class is on the outermost SuggestionCard div (border-red-200)
    const styledDiv = container.querySelector('.border-red-200');
    expect(styledDiv).toBeTruthy();
  });

  it('applies correct styling for medium priority', () => {
    const { container } = render(
      <HeartbeatWidget
        suggestions={[mockSuggestions[1]]}
        {...mockHandlers}
      />
    );

    const styledDiv = container.querySelector('.border-yellow-200');
    expect(styledDiv).toBeTruthy();
  });
});

describe('generateMockSuggestions', () => {
  it('generates mock suggestions', () => {
    const suggestions = generateMockSuggestions();

    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('generates suggestions with required fields', () => {
    const suggestions = generateMockSuggestions();

    suggestions.forEach(suggestion => {
      expect(suggestion).toHaveProperty('id');
      expect(suggestion).toHaveProperty('type');
      expect(suggestion).toHaveProperty('priority');
      expect(suggestion).toHaveProperty('title');
      expect(suggestion).toHaveProperty('description');
      expect(suggestion).toHaveProperty('reasoning');
      expect(suggestion).toHaveProperty('suggestedTemplates');
      expect(suggestion).toHaveProperty('suggestedPlatforms');
      expect(suggestion).toHaveProperty('createdAt');
    });
  });

  it('includes different suggestion types', () => {
    const suggestions = generateMockSuggestions();
    const types = new Set(suggestions.map(s => s.type));

    expect(types.size).toBeGreaterThan(1);
  });
});
