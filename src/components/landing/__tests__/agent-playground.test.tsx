
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('renders the default dispensary prompts', () => {
    render(<AgentPlayground />);
    expect(screen.getByText('Spy on competitor pricing near me')).toBeInTheDocument();
    expect(screen.getByText('Scan my site for compliance risks')).toBeInTheDocument();
    expect(screen.getByText('Show me how Smokey sells products')).toBeInTheDocument();
    expect(screen.getAllByText('See pricing & ROI breakdown')).toHaveLength(1);
  });

  it('switches to the brand prompts', () => {
    render(<AgentPlayground />);
    fireEvent.click(screen.getByRole('button', { name: 'Brand' }));

    expect(screen.getByText('Find dispensaries to carry my products')).toBeInTheDocument();
    expect(screen.getByText('Draft a campaign in 30 seconds')).toBeInTheDocument();
    expect(screen.getByText('See where my brand appears online')).toBeInTheDocument();
    expect(screen.getAllByText('See pricing & ROI breakdown')).toHaveLength(1);
  });

  it('renders the current public chat input and demo badge', () => {
    render(<AgentPlayground />);

    expect(screen.getByPlaceholderText('Ask Smokey anything...')).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });
});
