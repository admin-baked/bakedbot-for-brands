import {
  getMyWarmupStatus,
  startEmailWarmup,
  pauseEmailWarmup,
  getEmailWarmupLogs,
  recordWarmupSend,
} from '../email-warmup';
import { requireUser } from '@/server/auth/auth';
import {
  getWarmupStatus,
  startWarmup,
  pauseWarmup,
  getWarmupLogs,
  recordWarmupSend as recordWarmupSendService,
} from '@/server/services/email-warmup';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/server/services/email-warmup', () => ({
  getWarmupStatus: jest.fn(),
  startWarmup: jest.fn(),
  pauseWarmup: jest.fn(),
  getWarmupLogs: jest.fn(),
  recordWarmupSend: jest.fn(),
  getDailyLimit: jest.fn(),
  isWarmupActive: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('email-warmup actions security', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
      orgId: 'org-a',
    });

    (getWarmupStatus as jest.Mock).mockResolvedValue({ active: true });
    (startWarmup as jest.Mock).mockResolvedValue({ success: true });
    (pauseWarmup as jest.Mock).mockResolvedValue({ success: true });
    (getWarmupLogs as jest.Mock).mockResolvedValue([]);
    (recordWarmupSendService as jest.Mock).mockResolvedValue({
      success: true,
      limitReached: false,
      sentToday: 5,
      dailyLimit: 50,
    });
  });

  it('blocks non-super users from reading warmup status of another org', async () => {
    const result = await getMyWarmupStatus('org-b');

    expect(result).toEqual({ active: false });
    expect(getWarmupStatus).not.toHaveBeenCalled();
  });

  it('blocks non-super users from starting warmup for another org', async () => {
    const result = await startEmailWarmup('org-b', 'standard');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(startWarmup).not.toHaveBeenCalled();
  });

  it('allows super users to start warmup for any org', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      currentOrgId: 'org-super',
    });

    const result = await startEmailWarmup('org-b', 'aggressive');

    expect(result.success).toBe(true);
    expect(startWarmup).toHaveBeenCalledWith('org-b', 'aggressive');
  });

  it('blocks non-super users from pausing warmup for another org', async () => {
    const result = await pauseEmailWarmup('org-b');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(pauseWarmup).not.toHaveBeenCalled();
  });

  it('blocks non-super users from reading warmup logs of another org', async () => {
    const result = await getEmailWarmupLogs('org-b', 7);

    expect(result).toEqual([]);
    expect(getWarmupLogs).not.toHaveBeenCalled();
  });

  it('blocks non-super users from recording sends for another org', async () => {
    const result = await recordWarmupSend('org-b', 5);

    expect(result).toEqual({
      success: false,
      limitReached: false,
      sentToday: 0,
      dailyLimit: Infinity,
    });
    expect(recordWarmupSendService).not.toHaveBeenCalled();
  });

  it('allows same-org users to record sends', async () => {
    const result = await recordWarmupSend('org-a', 5);

    expect(result.success).toBe(true);
    expect(recordWarmupSendService).toHaveBeenCalledWith('org-a', 5);
  });
});

