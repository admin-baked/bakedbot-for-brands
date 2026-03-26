import { render, screen } from '@testing-library/react';
import { VisitorCheckinPromo } from '../visitor-checkin-promo';

describe('VisitorCheckinPromo', () => {
  it('links visitors to the rewards check-in flow and highlights the entry requirements', () => {
    render(
      <VisitorCheckinPromo
        brandName="Thrive Syracuse"
        brandSlug="thrivesyracuse"
        primaryColor="#16a34a"
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'BakedBot now checks visitors in before they shop at Thrive Syracuse',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Staff checks ID')).toBeInTheDocument();
    expect(screen.getByText('Phone required')).toBeInTheDocument();
    expect(screen.getByText('Email optional')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Check In Now/i })).toHaveAttribute(
      'href',
      '/thrivesyracuse/rewards#check-in',
    );
    expect(screen.getByRole('link', { name: 'See Rewards Details' })).toHaveAttribute(
      'href',
      '/thrivesyracuse/rewards',
    );
  });
});
