/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { Logo } from './logo';

describe('Logo', () => {
  it('renders the logo with the correct alt text', () => {
    render(<Logo />);

    const logoImage = screen.getByRole('img', { name: /BakedBot AI Logo/i });

    expect(logoImage).toBeInTheDocument();
  });

  it('has the correct aria-label for accessibility', () => {
    render(<Logo />);

    const logoContainer = screen.getByLabelText('BakedBot AI Home');
    expect(logoContainer).toBeInTheDocument();
  });
});
