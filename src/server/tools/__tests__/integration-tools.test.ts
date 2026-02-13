/**
 * Integration Tools Tests
 *
 * Unit tests for integration status checking and integration request creation.
 */

import type { IntegrationProvider } from '@/types/service-integrations';
import {
  checkIntegrationStatus,
  requestIntegration,
  executeIntegrationTool,
} from '../integration-tools';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { getAdminFirestore } from '@/firebase/admin';

function createMockFirestore() {
  const integrationDocs: Record<string, { get: jest.Mock; set: jest.Mock }> = {};

  const integrationsCollection = {
    doc: jest.fn((id: string) => {
      if (!integrationDocs[id]) {
        integrationDocs[id] = {
          get: jest.fn(),
          set: jest.fn(),
        };
      }
      return integrationDocs[id];
    }),
    get: jest.fn(),
  };

  const userDoc = {
    collection: jest.fn((name: string) => {
      if (name === 'integrations') return integrationsCollection;
      return { doc: jest.fn(), get: jest.fn() };
    }),
  };

  const usersCollection = {
    doc: jest.fn(() => userDoc),
  };

  const artifactDoc = {
    id: 'artifact-123',
    set: jest.fn().mockResolvedValue(undefined),
  };

  const inboxArtifactsCollection = {
    doc: jest.fn(() => artifactDoc),
  };

  const threadDocs: Record<string, { update: jest.Mock }> = {};

  const inboxThreadsCollection = {
    doc: jest.fn((id: string) => {
      if (!threadDocs[id]) {
        threadDocs[id] = { update: jest.fn().mockResolvedValue(undefined) };
      }
      return threadDocs[id];
    }),
  };

  const db = {
    collection: jest.fn((name: string) => {
      if (name === 'users') return usersCollection;
      if (name === 'inbox_artifacts') return inboxArtifactsCollection;
      if (name === 'inbox_threads') return inboxThreadsCollection;
      return { doc: jest.fn(), get: jest.fn() };
    }),
  };

  return {
    db,
    integrationsCollection,
    integrationDocs,
    artifactDoc,
    threadDocs,
  };
}

describe('Integration Tools', () => {
  let mocks: ReturnType<typeof createMockFirestore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = createMockFirestore();
    (getAdminFirestore as jest.Mock).mockReturnValue(mocks.db);
  });

  describe('checkIntegrationStatus', () => {
    it('should return disconnected status for non-existent integration', async () => {
      const integrationDoc = mocks.integrationsCollection.doc('gmail');
      integrationDoc.get.mockResolvedValue({ exists: false });

      const result = await checkIntegrationStatus('test-user-id', 'gmail');

      expect(result).toEqual({
        provider: 'gmail',
        connected: false,
        status: 'disconnected',
      });
    });

    it('should return connected status for valid integration', async () => {
      const integrationDoc = mocks.integrationsCollection.doc('gmail');
      integrationDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'connected',
          connectedAt: '2024-01-01T00:00:00Z',
          expiresAt: '2099-01-01T00:00:00Z',
        }),
      });

      const result = await checkIntegrationStatus('test-user-id', 'gmail');

      expect(result).toMatchObject({
        provider: 'gmail',
        connected: true,
        status: 'connected',
        connectedAt: '2024-01-01T00:00:00Z',
      });
    });

    it('should return expired status for expired OAuth token', async () => {
      const integrationDoc = mocks.integrationsCollection.doc('gmail');
      integrationDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          status: 'connected',
          connectedAt: '2024-01-01T00:00:00Z',
          expiresAt: '2024-06-01T00:00:00Z',
        }),
      });

      const result = await checkIntegrationStatus('test-user-id', 'gmail');

      expect(result).toMatchObject({
        provider: 'gmail',
        connected: false,
        status: 'expired',
      });
    });

    it('should return status map for all integrations when no provider specified', async () => {
      mocks.integrationsCollection.get.mockResolvedValue({
        forEach: (callback: any) => {
          callback({
            id: 'gmail',
            data: () => ({ status: 'connected', connectedAt: '2024-01-01T00:00:00Z' }),
          });
          callback({
            id: 'dutchie',
            data: () => ({ status: 'connected', connectedAt: '2024-01-02T00:00:00Z' }),
          });
        },
      });

      const result = await checkIntegrationStatus('test-user-id');

      expect(result).toHaveProperty('gmail');
      expect(result).toHaveProperty('dutchie');
      expect((result as any).gmail.connected).toBe(true);
      expect((result as any).dutchie.connected).toBe(true);
    });
  });

  describe('requestIntegration', () => {
    it('should create integration request artifact', async () => {
      const result = await requestIntegration({
        userId: 'user-123',
        orgId: 'org-456',
        threadId: 'thread-789',
        provider: 'gmail',
        reason: 'To send emails as you',
        enablesAction: 'send_gmail',
      });

      expect(result.success).toBe(true);
      expect((result as any).artifactId).toBeDefined();

      expect(mocks.artifactDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'integration_request',
          status: 'draft',
          data: expect.objectContaining({
            provider: 'gmail',
            reason: 'To send emails as you',
            enablesAction: 'send_gmail',
          }),
        })
      );
    });

    it('should return error for unknown provider', async () => {
      const result = await requestIntegration({
        userId: 'user-123',
        orgId: 'org-456',
        threadId: 'thread-789',
        provider: 'unknown-provider' as IntegrationProvider,
        reason: 'Test',
      });

      expect(result.success).toBe(false);
      expect((result as any).error).toContain('Unknown integration provider');
    });

    it('should update thread with artifact ID', async () => {
      await requestIntegration({
        userId: 'user-123',
        orgId: 'org-456',
        threadId: 'thread-789',
        provider: 'gmail',
        reason: 'To send emails',
      });

      // Thread doc is created on demand.
      expect(mocks.threadDocs['thread-789']).toBeDefined();
      expect(mocks.threadDocs['thread-789'].update).toHaveBeenCalled();
    });
  });

  describe('executeIntegrationTool', () => {
    it('should throw error for unknown tool', async () => {
      await expect(
        executeIntegrationTool('unknown_tool', {}, { userId: 'user-123', orgId: 'org-456' })
      ).rejects.toThrow('Unknown integration tool');
    });

    describe('check_integration_status', () => {
      it('should return formatted status for specific provider', async () => {
        const integrationDoc = mocks.integrationsCollection.doc('gmail');
        integrationDoc.get.mockResolvedValue({
          exists: true,
          data: () => ({ status: 'connected', connectedAt: '2024-01-01T00:00:00Z' }),
        });

        const result = await executeIntegrationTool(
          'check_integration_status',
          { provider: 'gmail' },
          { userId: 'user-123', orgId: 'org-456' }
        );

        expect(result).toMatchObject({
          provider: 'gmail',
          connected: true,
          status: 'connected',
          message: expect.stringContaining('gmail is connected'),
        });
      });

      it('should return summary for all integrations', async () => {
        mocks.integrationsCollection.get.mockResolvedValue({
          forEach: (callback: any) => {
            callback({ id: 'gmail', data: () => ({ status: 'connected' }) });
            callback({ id: 'dutchie', data: () => ({ status: 'disconnected' }) });
          },
        });

        const result = await executeIntegrationTool(
          'check_integration_status',
          {},
          { userId: 'user-123', orgId: 'org-456' }
        );

        expect(result.summary).toBeDefined();
        expect(result.summary.total).toBe(2);
        expect(result.summary.connected).toBeGreaterThan(0);
      });
    });

    describe('request_integration', () => {
      it('should create artifact and return success message', async () => {
        const integrationDoc = mocks.integrationsCollection.doc('gmail');
        integrationDoc.get.mockResolvedValue({ exists: false });

        const result = await executeIntegrationTool(
          'request_integration',
          { provider: 'gmail', reason: 'To send emails', enablesAction: 'send_gmail' },
          { userId: 'user-123', orgId: 'org-456', threadId: 'thread-789' }
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Gmail');
        expect(result.authMethod).toBe('oauth');
        expect(result.artifactId).toBeDefined();
      });

      it('should return error if integration already connected', async () => {
        const integrationDoc = mocks.integrationsCollection.doc('gmail');
        integrationDoc.get.mockResolvedValue({ exists: true, data: () => ({ status: 'connected' }) });

        const result = await executeIntegrationTool(
          'request_integration',
          { provider: 'gmail', reason: 'Test' },
          { userId: 'user-123', orgId: 'org-456', threadId: 'thread-789' }
        );

        expect(result.success).toBe(false);
        expect(result.alreadyConnected).toBe(true);
      });

      it('should throw error if threadId is missing', async () => {
        await expect(
          executeIntegrationTool(
            'request_integration',
            { provider: 'gmail', reason: 'Test' },
            { userId: 'user-123', orgId: 'org-456' }
          )
        ).rejects.toThrow('threadId is required');
      });
    });
  });

  describe('Integration Metadata', () => {
    it('should have valid metadata for all providers', async () => {
      const { INTEGRATION_METADATA } = await import('@/types/service-integrations');

      const providers: IntegrationProvider[] = [
        'gmail',
        'google_calendar',
        'dutchie',
        'alleaves',
        'mailchimp',
      ];

      providers.forEach((provider) => {
        const metadata = INTEGRATION_METADATA[provider];
        expect(metadata).toBeDefined();
        expect(metadata.name).toBeDefined();
        expect(metadata.description).toBeDefined();
        expect(metadata.icon).toBeDefined();
        expect(metadata.category).toBeDefined();
        expect(metadata.authMethod).toBeDefined();
        expect(metadata.setupTime).toBeDefined();
      });
    });

    it('should have correct auth methods for providers', async () => {
      const { INTEGRATION_METADATA } = await import('@/types/service-integrations');

      expect(INTEGRATION_METADATA.gmail.authMethod).toBe('oauth');
      expect(INTEGRATION_METADATA.dutchie.authMethod).toBe('api_key');
      expect(INTEGRATION_METADATA.alleaves.authMethod).toBe('jwt');
      expect(INTEGRATION_METADATA.mailchimp.authMethod).toBe('api_key');
    });
  });
});

