import {
  getCustomerCommunications,
  getUpcomingCommunications,
  logCommunication,
  updateCommunicationStatus,
} from '../customer-communications';
import { createServerClient } from '@/firebase/server-client';
import { getServerSessionUser } from '@/server/auth/session';

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/session', () => ({
  getServerSessionUser: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('customer communications actions', () => {
  const customerCommsDocRef = {
    get: jest.fn(),
    update: jest.fn(),
  };

  const customerCommsCollection = {
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    get: jest.fn(),
    doc: jest.fn(() => customerCommsDocRef),
  };

  const scheduledEmailsCollection = {
    where: jest.fn(),
    limit: jest.fn(),
    get: jest.fn(),
  };

  const firestore = {
    collection: jest.fn((name: string) => {
      if (name === 'customer_communications') return customerCommsCollection;
      if (name === 'scheduled_emails') return scheduledEmailsCollection;
      throw new Error(`Unexpected collection: ${name}`);
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    customerCommsCollection.where.mockReturnValue(customerCommsCollection);
    customerCommsCollection.orderBy.mockReturnValue(customerCommsCollection);
    customerCommsCollection.limit.mockReturnValue(customerCommsCollection);
    customerCommsCollection.get.mockResolvedValue({ docs: [] });
    customerCommsDocRef.get.mockResolvedValue({ exists: true, data: () => ({ orgId: 'org-a' }) });
    customerCommsDocRef.update.mockResolvedValue(undefined);

    scheduledEmailsCollection.where.mockReturnValue(scheduledEmailsCollection);
    scheduledEmailsCollection.limit.mockReturnValue(scheduledEmailsCollection);
    scheduledEmailsCollection.get.mockResolvedValue({
      docs: [
        {
          id: 'scheduled-1',
          data: () => ({
            email: 'customer@example.com',
            type: 'welcome',
            subject: 'Welcome back',
            preview: 'Preview text',
            channel: 'sms',
            playbookId: 'playbook-welcome',
            metadata: { playbookKind: 'welcome' },
            scheduledFor: { toDate: () => new Date('2026-03-12T10:00:00Z') },
            status: 'pending',
          }),
        },
        {
          id: 'scheduled-2',
          data: () => ({
            email: 'customer@example.com',
            type: 'winback',
            subject: 'We miss you',
            sendAt: { toDate: () => new Date('2026-03-13T12:00:00Z') },
            status: 'pending',
          }),
        },
      ],
    });

    (createServerClient as jest.Mock).mockResolvedValue({ firestore });
  });

  it('blocks non-super users from cross-org communication history reads', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const result = await getCustomerCommunications('customer@example.com', 'org-b');

    expect(result).toEqual([]);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('allows super users to read communication history for a specified org', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      currentOrgId: 'org-super',
      orgId: 'org-super',
    });

    await getCustomerCommunications('Customer@Example.com', 'org-b');

    expect(customerCommsCollection.where).toHaveBeenCalledWith('customerEmail', '==', 'customer@example.com');
    expect(customerCommsCollection.where).toHaveBeenCalledWith('orgId', '==', 'org-b');
  });

  it('maps upcoming communications with preview fields and sendAt fallback', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    const result = await getUpcomingCommunications('Customer@Example.com', 'org-a');

    expect(scheduledEmailsCollection.where).toHaveBeenCalledWith('email', '==', 'customer@example.com');
    expect(scheduledEmailsCollection.where).toHaveBeenCalledWith('orgId', '==', 'org-a');
    expect(scheduledEmailsCollection.where).toHaveBeenCalledWith('status', '==', 'pending');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(expect.objectContaining({
      id: 'scheduled-1',
      preview: 'Preview text',
      channel: 'sms',
      playbookId: 'playbook-welcome',
      metadata: { playbookKind: 'welcome' },
    }));
    expect(result[1].scheduledFor).toEqual(new Date('2026-03-13T12:00:00Z'));
  });

  it('blocks non-super users from updating communication status across orgs', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });
    customerCommsDocRef.get.mockResolvedValue({ exists: true, data: () => ({ orgId: 'org-b' }) });

    await updateCommunicationStatus('comm-1', 'opened');

    expect(customerCommsDocRef.update).not.toHaveBeenCalled();
  });

  it('allows same-org users to update communication status', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });
    customerCommsDocRef.get.mockResolvedValue({ exists: true, data: () => ({ orgId: 'org-a' }) });

    await updateCommunicationStatus('comm-1', 'opened');

    expect(customerCommsDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'opened',
        updatedAt: expect.any(Date),
        openedAt: expect.any(Date),
      }),
    );
  });

  it('rejects invalid communication logging inputs before firestore access', async () => {
    const invalidOrgResult = await logCommunication({
      customerEmail: 'customer@example.com',
      orgId: 'bad/org',
      channel: 'email',
      type: 'manual',
    });

    const missingEmailResult = await logCommunication({
      customerEmail: '   ',
      orgId: 'org-a',
      channel: 'sms',
      type: 'manual',
    });

    expect(invalidOrgResult).toBeNull();
    expect(missingEmailResult).toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('returns playbook metadata with communication history rows', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });
    customerCommsCollection.get.mockResolvedValue({
      docs: [
        {
          id: 'comm-1',
          data: () => ({
            customerEmail: 'customer@example.com',
            orgId: 'org-a',
            channel: 'email',
            direction: 'outbound',
            type: 'welcome',
            subject: 'Welcome',
            status: 'sent',
            playbookId: 'playbook-welcome',
            templateId: 'welcome_email_template',
            providerMessageId: 'provider-1',
            metadata: { playbookKind: 'welcome' },
            createdAt: { toDate: () => new Date('2026-03-10T10:00:00Z') },
            updatedAt: { toDate: () => new Date('2026-03-10T10:05:00Z') },
          }),
        },
      ],
    });

    const result = await getCustomerCommunications('customer@example.com', 'org-a');

    expect(result[0]).toEqual(expect.objectContaining({
      playbookId: 'playbook-welcome',
      templateId: 'welcome_email_template',
      providerMessageId: 'provider-1',
      metadata: { playbookKind: 'welcome' },
    }));
  });
});
