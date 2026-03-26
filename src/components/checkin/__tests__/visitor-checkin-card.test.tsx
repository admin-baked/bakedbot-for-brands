import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VisitorCheckinCard } from '../visitor-checkin-card';
import { captureVisitorCheckin } from '@/server/actions/visitor-checkin';

jest.mock('@/server/actions/visitor-checkin', () => ({
  captureVisitorCheckin: jest.fn(),
}));

describe('VisitorCheckinCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires first name, phone, and ID confirmation before submitting', async () => {
    render(
      <VisitorCheckinCard
        orgId="org_thrive_syracuse"
        brandName="Thrive Syracuse"
        brandSlug="thrivesyracuse"
        primaryColor="#16a34a"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Check In With BakedBot' }));
    expect(screen.getByRole('alert')).toHaveTextContent('First name is required.');

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jane' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check In With BakedBot' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Phone is required.');

    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '3155551212' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check In With BakedBot' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please confirm that a Thrive staff member checked your ID.',
    );
    expect(captureVisitorCheckin).not.toHaveBeenCalled();
  });

  it('renders marketing consent checkboxes unchecked by default', () => {
    render(
      <VisitorCheckinCard
        orgId="org_thrive_syracuse"
        brandName="Thrive Syracuse"
        brandSlug="thrivesyracuse"
        primaryColor="#16a34a"
      />,
    );

    expect(screen.getByLabelText('Text me Thrive updates and offers')).not.toBeChecked();
    expect(screen.getByLabelText('Email me Thrive updates and offers')).not.toBeChecked();
  });

  it('allows a phone-only submission with no marketing opt-in', async () => {
    (captureVisitorCheckin as jest.Mock).mockResolvedValue({
      success: true,
      isNewLead: true,
      isReturningCustomer: false,
    });

    render(
      <VisitorCheckinCard
        orgId="org_thrive_syracuse"
        brandName="Thrive Syracuse"
        brandSlug="thrivesyracuse"
        primaryColor="#16a34a"
      />,
    );

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '3155551212' } });
    fireEvent.click(screen.getByLabelText('A Thrive staff member already checked my ID today'));
    fireEvent.click(screen.getByRole('button', { name: 'Check In With BakedBot' }));

    await waitFor(() => {
      expect(captureVisitorCheckin).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'Jane',
        email: undefined,
        emailConsent: false,
        smsConsent: false,
        source: 'brand_rewards_checkin',
      }));
    });

    expect(await screen.findByText("You're checked in, Jane!")).toBeInTheDocument();
    expect(
      screen.getByText('You are checked in. Ask staff if you want help joining rewards later.'),
    ).toBeInTheDocument();
  });

  it('shows welcome-back copy for returning visitors', async () => {
    (captureVisitorCheckin as jest.Mock).mockResolvedValue({
      success: true,
      isNewLead: false,
      isReturningCustomer: true,
    });

    render(
      <VisitorCheckinCard
        orgId="org_thrive_syracuse"
        brandName="Thrive Syracuse"
        brandSlug="thrivesyracuse"
        primaryColor="#16a34a"
      />,
    );

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '3155551212' } });
    fireEvent.click(screen.getByLabelText('A Thrive staff member already checked my ID today'));
    fireEvent.click(screen.getByRole('button', { name: 'Check In With BakedBot' }));

    expect(await screen.findByText('Welcome back, Jane!')).toBeInTheDocument();
  });

  it('shows a non-blocking failure message when check-in fails', async () => {
    (captureVisitorCheckin as jest.Mock).mockResolvedValue({
      success: false,
      isNewLead: false,
      isReturningCustomer: false,
      error: 'temporary outage',
    });

    render(
      <VisitorCheckinCard
        orgId="org_thrive_syracuse"
        brandName="Thrive Syracuse"
        brandSlug="thrivesyracuse"
        primaryColor="#16a34a"
      />,
    );

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '3155551212' } });
    fireEvent.click(screen.getByLabelText('A Thrive staff member already checked my ID today'));
    fireEvent.click(screen.getByRole('button', { name: 'Check In With BakedBot' }));

    expect(
      await screen.findByText('Check-in is temporarily unavailable. Staff can still let you in.'),
    ).toBeInTheDocument();
  });
});
