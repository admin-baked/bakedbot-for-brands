/**
 * Scheduled Emails Cron Job Tests
 *
 * Tests for the email automation cron endpoint
 */

// Mock Firebase Admin
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockCollection = jest.fn(() => ({
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: mockGet,
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: mockCollection,
  })),
}));

// Mock email service
jest.mock('@/server/services/academy-welcome', () => ({
  sendAcademyValueEmail: jest.fn().mockResolvedValue({ success: true }),
  sendAcademyDemoEmail: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock NextRequest and NextResponse
const createMockRequest = (options: { authorization?: string } = {}) => ({
  headers: {
    get: (name: string) => {
      if (name === 'authorization') return options.authorization;
      return null;
    },
  },
});

// We need to mock the entire module because NextRequest isn't available in test env
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data: any, init?: any) => ({
      status: init?.status || 200,
      json: async () => data,
    })),
  },
}));

describe('Scheduled Emails Cron Job', () => {
  let GET: any;

  beforeAll(async () => {
    // Dynamic import after mocks are set up
    const module = await import('../route');
    GET = module.GET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  describe('Authorization', () => {
    it('should reject requests without authorization header', async () => {
      const mockRequest = createMockRequest();

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid authorization', async () => {
      const mockRequest = createMockRequest({ authorization: 'Bearer wrong-secret' });

      const response = await GET(mockRequest);

      expect(response.status).toBe(401);
    });

    it('should accept requests with valid authorization', async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const mockRequest = createMockRequest({ authorization: 'Bearer test-secret' });

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should allow requests when CRON_SECRET is not set', async () => {
      delete process.env.CRON_SECRET;
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const mockRequest = createMockRequest();

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('Email Processing', () => {
    it('should return success when no emails to process', async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const mockRequest = createMockRequest({ authorization: 'Bearer test-secret' });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processed).toBe(0);
      expect(data.message).toBe('No emails to process');
    });

    it('should process pending academy_value emails', async () => {
      const mockDoc = {
        id: 'email-123',
        data: () => ({
          type: 'academy_value',
          leadId: 'lead-456',
          email: 'test@example.com',
          firstName: 'Test',
          company: 'Test Co',
        }),
        ref: {
          update: mockUpdate.mockResolvedValue(undefined),
        },
      };

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [mockDoc],
      });

      const mockRequest = createMockRequest({ authorization: 'Bearer test-secret' });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.successful).toBe(1);
      expect(data.failed).toBe(0);
    });

    it('should process pending academy_demo emails', async () => {
      const mockDoc = {
        id: 'email-789',
        data: () => ({
          type: 'academy_demo',
          leadId: 'lead-101',
          email: 'demo@example.com',
          firstName: 'Demo',
          company: 'Demo Inc',
        }),
        ref: {
          update: mockUpdate.mockResolvedValue(undefined),
        },
      };

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [mockDoc],
      });

      const mockRequest = createMockRequest({ authorization: 'Bearer test-secret' });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.successful).toBe(1);
    });

    it('should handle unknown email types gracefully', async () => {
      const mockDoc = {
        id: 'email-unknown',
        data: () => ({
          type: 'unknown_type',
          leadId: 'lead-999',
          email: 'unknown@example.com',
        }),
        ref: {
          update: mockUpdate.mockResolvedValue(undefined),
        },
      };

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [mockDoc],
      });

      const mockRequest = createMockRequest({ authorization: 'Bearer test-secret' });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.failed).toBe(1);
      expect(data.errors).toHaveLength(1);
      expect(data.errors[0]).toContain('Unknown email type');
    });

    it('should process multiple emails in batch', async () => {
      const mockDocs = [
        {
          id: 'email-1',
          data: () => ({
            type: 'academy_value',
            leadId: 'lead-1',
            email: 'user1@example.com',
          }),
          ref: { update: mockUpdate.mockResolvedValue(undefined) },
        },
        {
          id: 'email-2',
          data: () => ({
            type: 'academy_demo',
            leadId: 'lead-2',
            email: 'user2@example.com',
          }),
          ref: { update: mockUpdate.mockResolvedValue(undefined) },
        },
      ];

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      });

      const mockRequest = createMockRequest({ authorization: 'Bearer test-secret' });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processed).toBe(2);
      expect(data.successful).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle email send failures', async () => {
      const { sendAcademyValueEmail } = require('@/server/services/academy-welcome');
      sendAcademyValueEmail.mockRejectedValueOnce(new Error('SMTP Error'));

      const mockDoc = {
        id: 'email-fail',
        data: () => ({
          type: 'academy_value',
          leadId: 'lead-fail',
          email: 'fail@example.com',
        }),
        ref: { update: mockUpdate.mockResolvedValue(undefined) },
      };

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [mockDoc],
      });

      const mockRequest = createMockRequest({ authorization: 'Bearer test-secret' });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.failed).toBe(1);
      expect(data.errors[0]).toContain('SMTP Error');
    });

    it('should mark failed emails with error status', async () => {
      const { sendAcademyValueEmail } = require('@/server/services/academy-welcome');
      sendAcademyValueEmail.mockRejectedValueOnce(new Error('Connection timeout'));

      const mockDoc = {
        id: 'email-timeout',
        data: () => ({
          type: 'academy_value',
          leadId: 'lead-timeout',
          email: 'timeout@example.com',
        }),
        ref: { update: mockUpdate },
      };

      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [mockDoc],
      });

      const mockRequest = createMockRequest({ authorization: 'Bearer test-secret' });

      await GET(mockRequest);

      // Verify update was called with failed status
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: 'Connection timeout',
        })
      );
    });
  });
});
