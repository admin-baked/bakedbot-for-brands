
import { render, screen } from '@testing-library/react';
import { AgentPlayground } from '../agent-playground';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/server/actions/landing-geo', () => ({
  getLandingGeoData: jest.fn().mockResolvedValue({
    location: { city: 'Chicago', state: 'IL' },
    retailers: [],
    brands: []
  })
}));

jest.mock('@/components/landing/email-capture-modal', () => ({
  EmailCaptureModal: () => <div data-testid="email-modal">Email Modal</div>
}));

describe('AgentPlayground', () => {
  it('renders "Smokey Chat" header', () => {
    render(<AgentPlayground />);
    expect(screen.getByText('Smokey Chat')).toBeInTheDocument();
  });

  it('displays the correct Smokey agent icon', () => {
    render(<AgentPlayground />);
    const img = screen.getByAltText('Smokey Agent');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/assets/agents/smokey-main.png');
  });

  it('renders default suggestions', () => {
    render(<AgentPlayground />);
    expect(screen.getByText('How does BakedBot work?')).toBeInTheDocument();
    expect(screen.getByText('Explain the pricing model')).toBeInTheDocument();
  });
});
