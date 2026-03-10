import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GlobalChatbot from '../global-chatbot';

const mockUsePathname = jest.fn();
const mockChatbot = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('@/components/chatbot', () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockChatbot(props);
    return <div data-testid="chatbot-root">Chatbot</div>;
  },
}));

describe('GlobalChatbot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the global chatbot on non-dashboard routes', () => {
    mockUsePathname.mockReturnValue('/');

    render(<GlobalChatbot products={[]} />);

    expect(screen.getByTestId('chatbot-root')).toBeInTheDocument();
    expect(mockChatbot).toHaveBeenCalledWith(
      expect.objectContaining({ products: [] })
    );
  });

  it('hides the global chatbot on dashboard routes', () => {
    mockUsePathname.mockReturnValue('/dashboard/inbox');

    const { container } = render(<GlobalChatbot products={[]} />);

    expect(container).toBeEmptyDOMElement();
    expect(mockChatbot).not.toHaveBeenCalled();
  });
});
