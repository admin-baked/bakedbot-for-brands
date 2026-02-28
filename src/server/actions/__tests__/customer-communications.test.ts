import {
  logCommunication,
  getCustomerCommunications,
  getUpcomingCommunications,
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

describe('customer-communications access control', () => {
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
    orderBy: jest.fn(),
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
    scheduledEmailsCollection.orderBy.mockReturnValue(scheduledEmailsCollection);
    scheduledEmailsCollection.limit.mockReturnValue(scheduledEmailsCollection);
    scheduledEmailsCollection.get.mockResolvedValue({ docs: [] });

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

  it('scopes upcoming scheduled communications by orgId', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    await getUpcomingCommunications('Customer@Example.com', 'org-a');

    expect(scheduledEmailsCollection.where).toHaveBeenCalledWith('email', '==', 'customer@example.com');
    expect(scheduledEmailsCollection.where).toHaveBeenCalledWith('orgId', '==', 'org-a');
    expect(scheduledEmailsCollection.where).toHaveBeenCalledWith('status', '==', 'pending');
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

  it('blocks non-super users with missing org context from reading communications', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
    });

    const result = await getCustomerCommunications('customer@example.com', 'org-a');

    expect(result).toEqual([]);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('rejects invalid communication id path before firestore access', async () => {
    await updateCommunicationStatus('comm/1', 'opened');

    expect(getServerSessionUser).not.toHaveBeenCalled();
    expect(createServerClient).not.toHaveBeenCalled();
    expect(customerCommsDocRef.update).not.toHaveBeenCalled();
  });

  it('rejects communication logging with invalid org ids', async () => {
    const result = await logCommunication({
      customerEmail: 'customer@example.com',
      orgId: 'bad/org',
      channel: 'email',
      type: 'manual',
    });

    expect(result).toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('rejects communication logging with missing recipient identifier', async () => {
    const result = await logCommunication({
      customerEmail: '   ',
      orgId: 'org-a',
      channel: 'sms',
      type: 'manual',
    });

    expect(result).toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
