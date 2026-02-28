import {
  lookupCustomerAction,
  getCustomerHistoryAction,
  getCustomerCommsAction,
} from '../crm-panel';
import { requireUser } from '@/server/auth/auth';
import { lookupCustomer, getCustomerHistory, getCustomerComms } from '@/server/tools/crm-tools';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/server/tools/crm-tools', () => ({
  lookupCustomer: jest.fn(),
  getCustomerHistory: jest.fn(),
  getCustomerComms: jest.fn(),
}));

describe('crm-panel security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      orgId: 'org-a',
    });
  });

  it('blocks non-super users from cross-org customer lookup', async () => {
    await expect(lookupCustomerAction('alice@example.com', 'org-b')).rejects.toThrow('Unauthorized');
    expect(lookupCustomer).not.toHaveBeenCalled();
  });

  it('blocks non-super users from cross-org customer history access', async () => {
    await expect(getCustomerHistoryAction('cust-1', 'org-b', 5)).rejects.toThrow('Unauthorized');
    expect(getCustomerHistory).not.toHaveBeenCalled();
  });

  it('blocks non-super users from cross-org customer comms access', async () => {
    await expect(getCustomerCommsAction('alice@example.com', 'org-b', 5)).rejects.toThrow('Unauthorized');
    expect(getCustomerComms).not.toHaveBeenCalled();
  });

  it('allows same-org access', async () => {
    (lookupCustomer as jest.Mock).mockResolvedValue({ summary: 'ok', customer: null });

    const result = await lookupCustomerAction('alice@example.com', 'org-a');

    expect(result).toEqual({ summary: 'ok', customer: null });
    expect(lookupCustomer).toHaveBeenCalledWith('alice@example.com', 'org-a');
  });

  it('allows super users cross-org access', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      orgId: 'org-a',
    });
    (getCustomerComms as jest.Mock).mockResolvedValue({ summary: 'ok', comms: [] });

    const result = await getCustomerCommsAction('alice@example.com', 'org-b', 10);

    expect(result).toEqual({ summary: 'ok', comms: [] });
    expect(getCustomerComms).toHaveBeenCalledWith('alice@example.com', 'org-b', 10);
  });

  it('rejects invalid org ids before lookup', async () => {
    await expect(lookupCustomerAction('alice@example.com', 'bad/id')).rejects.toThrow('Invalid organization ID');
    expect(requireUser).not.toHaveBeenCalled();
    expect(lookupCustomer).not.toHaveBeenCalled();
  });

  it('clamps history limit to a sane max', async () => {
    (getCustomerHistory as jest.Mock).mockResolvedValue({ summary: 'ok', history: [] });

    await getCustomerHistoryAction('cust-1', 'org-a', 999);

    expect(getCustomerHistory).toHaveBeenCalledWith('cust-1', 'org-a', 100);
  });
});
