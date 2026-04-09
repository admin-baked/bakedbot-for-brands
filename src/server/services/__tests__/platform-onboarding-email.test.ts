import {
  schedulePlatformOnboardingEmailSeries,
  sendPlatformOnboardingEmail,
} from '../platform-onboarding-email';
import { sendGenericEmail } from '@/lib/email/dispatcher';

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: mockCollection,
  })),
}));

jest.mock('@/lib/email/dispatcher', () => ({
  sendGenericEmail: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('platform onboarding email service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ exists: false });
    mockSet.mockResolvedValue(undefined);
    mockDoc.mockImplementation((id: string) => ({
      id,
      get: mockGet,
      set: mockSet,
    }));
    mockCollection.mockReturnValue({
      doc: mockDoc,
    });
    (sendGenericEmail as jest.Mock).mockResolvedValue({ success: true });
  });

  it('schedules seven first-week emails', async () => {
    await schedulePlatformOnboardingEmailSeries({
      userId: 'user-123',
      email: 'owner@example.com',
      firstName: 'Avery',
      role: 'dispensary',
      orgId: 'org-123',
      primaryGoal: 'checkin_tablet',
      workspaceName: 'Avery Dispensary',
    });

    expect(mockDoc).toHaveBeenCalledTimes(7);
    expect(mockDoc).toHaveBeenCalledWith('platform_onboarding:user-123:day:0');
    expect(mockDoc).toHaveBeenCalledWith('platform_onboarding:user-123:day:6');
    expect(mockSet).toHaveBeenCalledTimes(7);
  });

  it('sends the first-week email through the welcome channel and includes Martez booking', async () => {
    await sendPlatformOnboardingEmail({
      userId: 'user-123',
      email: 'owner@example.com',
      firstName: 'Avery',
      role: 'dispensary',
      orgId: 'org-123',
      primaryGoal: 'competitive_intelligence',
      workspaceName: 'Avery Dispensary',
      sequenceType: 'first_week',
      dayIndex: 0,
      topicKey: 'start_here',
      scheduledAt: Date.now(),
    });

    expect(sendGenericEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@example.com',
        communicationType: 'welcome',
        fromEmail: 'team@bakedbot.ai',
        subject: expect.stringContaining('Competitive Intelligence Report'),
        htmlBody: expect.stringContaining('/martez'),
      })
    );
  });

  it('rotates weekly feature spotlights by role', async () => {
    await sendPlatformOnboardingEmail({
      userId: 'brand-user',
      email: 'brand@example.com',
      firstName: 'Jordan',
      role: 'brand',
      orgId: 'org-brand',
      primaryGoal: 'creative_center',
      workspaceName: 'Jordan Brand',
      sequenceType: 'weekly_feature',
      weekIndex: 0,
      scheduledAt: Date.now(),
    });

    expect(sendGenericEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Creative Center'),
        htmlBody: expect.stringContaining('/help/marketing/creative-content'),
      })
    );
  });

  it('treats modern dispensary roles like dispensary onboarding paths', async () => {
    await sendPlatformOnboardingEmail({
      userId: 'disp-admin',
      email: 'disp@example.com',
      firstName: 'Taylor',
      role: 'dispensary_admin',
      orgId: 'org-dispensary',
      primaryGoal: 'competitive_intelligence',
      workspaceName: 'Taylor Dispensary',
      sequenceType: 'weekly_feature',
      weekIndex: 0,
      scheduledAt: Date.now(),
    });

    expect(sendGenericEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Competitive Intelligence'),
        htmlBody: expect.stringContaining('/help/agents/ezal'),
      })
    );
  });
});
