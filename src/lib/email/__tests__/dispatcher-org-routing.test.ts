import { getAdminFirestore } from '@/firebase/admin';
import { resolveOrgSesFrom } from '../dispatcher';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../sendgrid', () => ({
  sendOrderConfirmationEmail: jest.fn(),
  sendGenericEmail: jest.fn(),
}));

jest.mock('../mailjet', () => ({
  sendOrderConfirmationEmail: jest.fn(),
  sendGenericEmail: jest.fn(),
}));

jest.mock('../ses', () => ({
  sendSesEmail: jest.fn(),
}));

jest.mock('@/server/integrations/gmail/token-storage', () => ({
  getGmailToken: jest.fn(),
}));

jest.mock('@/server/integrations/google-workspace/token-storage', () => ({
  getWorkspaceToken: jest.fn(),
}));

jest.mock('@/server/integrations/gmail/send', () => ({
  sendGmail: jest.fn(),
}));

jest.mock('@/server/utils/encryption', () => ({
  encrypt: jest.fn((value: string) => value),
  decrypt: jest.fn((value: string) => value),
}));

function makeFirestoreMock() {
  const sesGet = jest.fn().mockResolvedValue({
    exists: false,
    data: () => undefined,
  });
  const orgGet = jest.fn().mockResolvedValue({
    exists: false,
    data: () => undefined,
  });
  const brandGet = jest.fn().mockResolvedValue({
    exists: true,
    data: () => ({ name: 'Ecstatic Edibles' }),
  });

  return {
    collection: jest.fn((name: string) => {
      if (name === 'organizations') {
        return {
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              doc: jest.fn(() => ({
                get: sesGet,
              })),
            })),
            get: orgGet,
          })),
        };
      }

      if (name === 'brands') {
        return {
          doc: jest.fn(() => ({
            get: brandGet,
          })),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  };
}

describe('resolveOrgSesFrom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes brand-scoped Ecstatic mail through the tenant SES subdomain', async () => {
    (getAdminFirestore as jest.Mock).mockReturnValue(makeFirestoreMock());

    await expect(resolveOrgSesFrom('brand_ecstatic_edibles')).resolves.toEqual({
      email: 'hello@ecstatic.bakedbot.ai',
      name: 'Ecstatic Edibles',
    });
  });

  it('keeps the tenant email but respects an explicit display name override', async () => {
    (getAdminFirestore as jest.Mock).mockReturnValue(makeFirestoreMock());

    await expect(
      resolveOrgSesFrom('brand_ecstatic_edibles', 'team@bakedbot.ai', 'Ecstatic Team')
    ).resolves.toEqual({
      email: 'hello@ecstatic.bakedbot.ai',
      name: 'Ecstatic Team',
    });
  });
});
