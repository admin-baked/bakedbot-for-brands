import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MCBAPowerHourPage } from '../mcba-power-hour-page';
import {
  MCBA_ONBOARDING_HREF,
  MCBA_RECAP_PUBLIC_URL,
  MCBA_SMOKEY_PUBLIC_URL,
} from '@/lib/constants/mcba-power-hour-ama';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, priority, ...props }: any) => <img alt={alt} {...props} />,
}));

jest.mock('@/components/landing/navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}));

jest.mock('@/components/landing/footer', () => ({
  LandingFooter: () => <div data-testid="footer" />,
}));

jest.mock('@/components/analytics/PageViewTracker', () => ({
  PageViewTracker: () => <div data-testid="page-view-tracker" />,
  TrackableButton: ({ href, className, children }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('MCBAPowerHourPage', () => {
  it('renders explicit messaging for brands and dispensaries', () => {
    render(<MCBAPowerHourPage />);

    expect(screen.getByText('For brands')).toBeInTheDocument();
    expect(screen.getByText('For dispensaries')).toBeInTheDocument();
  });

  it('uses the canonical onboarding CTA for both landing-page CTAs', () => {
    render(<MCBAPowerHourPage />);

    const ctas = screen.getAllByRole('link', { name: /credits/i });
    expect(ctas).toHaveLength(2);
    expect(ctas[0]).toHaveAttribute('href', MCBA_ONBOARDING_HREF);
    expect(ctas[1]).toHaveAttribute('href', MCBA_ONBOARDING_HREF);
  });

  it('renders both campaign videos from the published MCBA asset URLs', () => {
    render(<MCBAPowerHourPage />);

    expect(screen.getByTitle(/necann recap/i)).toHaveAttribute('src', MCBA_RECAP_PUBLIC_URL);
    expect(screen.getByTitle(/smokey ai campaign video/i)).toHaveAttribute('src', MCBA_SMOKEY_PUBLIC_URL);
  });
});
