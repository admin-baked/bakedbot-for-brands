import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CheckInSettingsPanel } from '../checkin-settings-panel';
import { saveCheckinConfig } from '@/server/actions/checkin-management';

const mockToast = jest.fn();

jest.mock('@/server/actions/checkin-management', () => ({
  saveCheckinConfig: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('CheckInSettingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (saveCheckinConfig as jest.Mock).mockResolvedValue({ success: true });
  });

  it('persists flow switches immediately when toggled', async () => {
    render(
      <CheckInSettingsPanel
        orgId="org_thrive_syracuse"
        initial={{
          checkInEnabled: true,
          publicFlowEnabled: true,
          gmapsPlaceId: '',
          inStoreOffer: '1c pre-roll',
          welcomeHeadline: 'Welcome to Thrive',
          tabletIdleTimeoutSec: 20,
          updatedAt: null,
        }}
      />,
    );

    fireEvent.click(screen.getAllByRole('switch')[0]);

    await waitFor(() => {
      expect(saveCheckinConfig).toHaveBeenCalledWith('org_thrive_syracuse', {
        publicFlowEnabled: false,
      });
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Settings saved',
      description: 'Flow switch updated.',
    }));
  });
});
