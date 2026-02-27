import {
  sendCampaignFromInbox,
  scheduleCampaignFromInbox,
  convertOutreachToPlaybook,
} from '../campaign-inbox';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { deebo } from '@/server/agents/deebo';
import { resolveAudience } from '@/server/services/campaign-sender';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/email/dispatcher', () => ({
  sendGenericEmail: jest.fn(),
}));

jest.mock('@/server/agents/deebo', () => ({
  deebo: {
    checkContent: jest.fn(),
  },
}));

jest.mock('@/server/services/campaign-sender', () => ({
  resolveAudience: jest.fn(),
  personalize: jest.fn((body: string) => body),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('campaign-inbox actions', () => {
  const mockArtifactGet = jest.fn();
  const mockArtifactUpdate = jest.fn();
  const mockInboArtifactDoc = {
    get: mockArtifactGet,
    update: mockArtifactUpdate,
  };
  const mockPlaybookSet = jest.fn();
  const mockPlaybookDoc = {
    id: 'pb-1',
    set: mockPlaybookSet,
  };
  const mockCollection = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      orgId: 'org-base',
      currentOrgId: 'org-current',
    });

    mockCollection.mockImplementation((name: string) => {
      if (name === 'inbox_artifacts') {
        return {
          doc: jest.fn(() => mockInboArtifactDoc),
        };
      }
      if (name === 'playbooks') {
        return {
          doc: jest.fn(() => mockPlaybookDoc),
        };
      }
      return {
        doc: jest.fn(() => ({ id: 'generic-doc', get: jest.fn(), set: jest.fn() })),
      };
    });

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: mockCollection,
    });
  });

  it('uses currentOrgId context and rejects sms fast-path sends', async () => {
    mockArtifactGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orgId: 'org-current',
        type: 'outreach_draft',
        data: {
          channel: 'sms',
          body: 'SMS body',
          targetSegments: [],
        },
      }),
    });

    const result = await sendCampaignFromInbox({ artifactId: 'art-1' });

    expect(result).toEqual({
      success: false,
      error: 'SMS outreach drafts are not supported in inbox fast-path yet. Use the campaign wizard.',
    });
    expect(deebo.checkContent).not.toHaveBeenCalled();
    expect(resolveAudience).not.toHaveBeenCalled();
    expect(sendGenericEmail).not.toHaveBeenCalled();
  });

  it('rejects invalid artifact ids before auth checks', async () => {
    const scheduledAt = new Date(Date.now() + 60_000).toISOString();

    const sendResult = await sendCampaignFromInbox({ artifactId: 'bad/id' });
    const scheduleResult = await scheduleCampaignFromInbox({ artifactId: 'bad/id', scheduledAt });
    const convertResult = await convertOutreachToPlaybook({
      artifactId: 'bad/id',
      playbookName: 'Weekly Followup',
    });

    expect(sendResult).toEqual({ success: false, error: 'Invalid artifact id.' });
    expect(scheduleResult).toEqual({ success: false, error: 'Invalid artifact id.' });
    expect(convertResult).toEqual({ success: false, error: 'Invalid artifact id.' });
    expect(requireUser).not.toHaveBeenCalled();
    expect(mockArtifactGet).not.toHaveBeenCalled();
  });

  it('requires org context for non-super users', async () => {
    (requireUser as jest.Mock).mockResolvedValueOnce({
      uid: 'user-1',
      role: 'dispensary_admin',
    });

    const result = await sendCampaignFromInbox({ artifactId: 'art-missing-org' });

    expect(result).toEqual({
      success: false,
      error: 'Missing organization context.',
    });
    expect(mockArtifactGet).not.toHaveBeenCalled();
  });

  it('allows super users without org context to access cross-org artifacts', async () => {
    (requireUser as jest.Mock).mockResolvedValueOnce({
      uid: 'super-1',
      role: 'super_user',
    });
    mockArtifactGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orgId: 'org-other',
        type: 'outreach_draft',
        data: {
          channel: 'sms',
          body: 'SMS body',
          targetSegments: [],
        },
      }),
    });

    const result = await sendCampaignFromInbox({ artifactId: 'art-super' });

    expect(result).toEqual({
      success: false,
      error: 'SMS outreach drafts are not supported in inbox fast-path yet. Use the campaign wizard.',
    });
    expect(deebo.checkContent).not.toHaveBeenCalled();
  });

  it('does not update artifacts from another org when authorization fails', async () => {
    mockArtifactGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orgId: 'org-other',
        type: 'outreach_draft',
        data: {
          channel: 'email',
          body: 'Body',
          targetSegments: [],
        },
      }),
    });

    const result = await sendCampaignFromInbox({ artifactId: 'art-unauthorized' });

    expect(result).toEqual({ success: false, error: 'Unauthorized' });
    expect(mockArtifactUpdate).not.toHaveBeenCalled();
    expect(deebo.checkContent).not.toHaveBeenCalled();
  });

  it('rejects sms fast-path scheduling', async () => {
    mockArtifactGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orgId: 'org-current',
        type: 'outreach_draft',
        data: {
          channel: 'sms',
          body: 'SMS body',
          targetSegments: [],
        },
      }),
    });

    const result = await scheduleCampaignFromInbox({
      artifactId: 'art-1',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
    });

    expect(result).toEqual({
      success: false,
      error: 'SMS outreach drafts are not supported in inbox fast-path yet. Use the campaign wizard.',
    });
    expect(deebo.checkContent).not.toHaveBeenCalled();
  });

  it('validates playbook name before converting outreach drafts', async () => {
    mockArtifactGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orgId: 'org-current',
        type: 'outreach_draft',
        data: {
          channel: 'email',
          body: 'Email body',
          targetSegments: ['vip'],
        },
      }),
    });

    const result = await convertOutreachToPlaybook({
      artifactId: 'art-2',
      playbookName: '   ',
    });

    expect(result).toEqual({
      success: false,
      error: 'Playbook name is required.',
    });
    expect(mockPlaybookSet).not.toHaveBeenCalled();
  });

  it('validates cron schedule format when converting outreach drafts', async () => {
    mockArtifactGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orgId: 'org-current',
        type: 'outreach_draft',
        data: {
          channel: 'email',
          body: 'Email body',
          targetSegments: ['vip'],
        },
      }),
    });

    const result = await convertOutreachToPlaybook({
      artifactId: 'art-2',
      playbookName: 'Weekly VIP Followup',
      cronSchedule: 'every day at 9am',
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid cron schedule format. Use 5-field cron syntax.',
    });
    expect(mockPlaybookSet).not.toHaveBeenCalled();
  });

  it('records bounceRate from failed sends even when sentCount is zero', async () => {
    const mockCampaignSet = jest.fn().mockResolvedValue(undefined);
    const mockCampaignUpdate = jest.fn().mockResolvedValue(undefined);
    const mockRecipientDoc = jest.fn(() => ({ id: 'recipient-1' }));
    const mockCampaignDoc = {
      id: 'camp-1',
      set: mockCampaignSet,
      update: mockCampaignUpdate,
      collection: jest.fn((name: string) => {
        if (name === 'recipients') {
          return { doc: mockRecipientDoc };
        }
        return { doc: jest.fn(() => ({ id: 'child-doc' })) };
      }),
    };
    const mockCampaignCollection = {
      doc: jest.fn(() => mockCampaignDoc),
    };
    const mockTenantDoc = {
      get: jest.fn().mockResolvedValue({
        data: () => ({ name: 'Org Name' }),
      }),
    };
    const mockCommsCollection = {
      doc: jest.fn(() => ({ id: 'comm-1' })),
    };
    const mockBatchSet = jest.fn();
    const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
    const mockBatch = {
      set: mockBatchSet,
      commit: mockBatchCommit,
    };

    mockArtifactGet.mockResolvedValue({
      exists: true,
      data: () => ({
        orgId: 'org-current',
        type: 'outreach_draft',
        data: {
          channel: 'email',
          subject: 'Subject',
          body: 'Body',
          targetSegments: ['vip'],
        },
      }),
    });

    (deebo.checkContent as jest.Mock).mockResolvedValue({
      status: 'pass',
      violations: [],
      suggestions: [],
    });
    (resolveAudience as jest.Mock).mockResolvedValue([
      {
        customerId: 'cust-1',
        email: 'customer@example.com',
        firstName: 'First',
        lastName: 'Last',
        segment: 'vip',
      },
    ]);
    (sendGenericEmail as jest.Mock).mockResolvedValue({ success: false });

    const mockDb = {
      collection: jest.fn((name: string) => {
        if (name === 'inbox_artifacts') {
          return {
            doc: jest.fn(() => mockInboArtifactDoc),
          };
        }
        if (name === 'campaigns') return mockCampaignCollection;
        if (name === 'tenants') {
          return {
            doc: jest.fn(() => mockTenantDoc),
          };
        }
        if (name === 'customer_communications') return mockCommsCollection;
        if (name === 'playbooks') {
          return {
            doc: jest.fn(() => mockPlaybookDoc),
          };
        }
        return {
          doc: jest.fn(() => ({ id: 'generic-doc', get: jest.fn(), set: jest.fn() })),
        };
      }),
      batch: jest.fn(() => mockBatch),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);

    const result = await sendCampaignFromInbox({ artifactId: 'art-bounce' });

    expect(result.success).toBe(true);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);

    expect(mockCampaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        performance: expect.objectContaining({
          totalRecipients: 1,
          sent: 0,
          bounced: 1,
          bounceRate: 1,
        }),
      })
    );
  });
});
