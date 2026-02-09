/**
 * Academy Welcome Email Service Tests
 *
 * Tests for email nurture sequence and tracking
 */

// Mock modules before importing
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/email/dispatcher', () => ({
  sendGenericEmail: jest.fn().mockResolvedValue({ success: true }),
}));

const mockAdd = jest.fn().mockResolvedValue({ id: 'scheduled-123' });
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      add: mockAdd,
    })),
  })),
}));

jest.mock('@/server/services/letta', () => ({
  archivalTagsService: {
    insertWithTags: jest.fn().mockResolvedValue({ success: true }),
  },
  CATEGORY_TAGS: {
    CUSTOMER: 'category:customer',
  },
  AGENT_TAGS: {
    MRS_PARKER: 'agent:mrs_parker',
  },
}));

import {
  sendAcademyWelcomeEmail,
  sendAcademyValueEmail,
  sendAcademyDemoEmail,
} from '../academy-welcome';
import { sendGenericEmail } from '@/lib/email/dispatcher';

describe('Academy Welcome Email Service', () => {
  const mockContext = {
    leadId: 'lead-123',
    email: 'test@example.com',
    firstName: 'Test',
    company: 'Test Company',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'academy-launch',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendAcademyWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      const result = await sendAcademyWelcomeEmail(mockContext);

      expect(result.success).toBe(true);
      expect(sendGenericEmail).toHaveBeenCalled();
    });

    it('should use correct from address', async () => {
      await sendAcademyWelcomeEmail(mockContext);

      expect(sendGenericEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          fromName: 'Cannabis Marketing AI Academy',
          fromEmail: 'academy@bakedbot.ai',
        })
      );
    });

    it('should include personalized subject line', async () => {
      await sendAcademyWelcomeEmail(mockContext);

      expect(sendGenericEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Test'),
        })
      );
    });

    it('should schedule follow-up emails', async () => {
      await sendAcademyWelcomeEmail(mockContext);

      // Should schedule 2 follow-up emails (Day 3 and Day 7)
      expect(mockAdd).toHaveBeenCalledTimes(2);
    });

    it('should schedule Day 3 value email', async () => {
      await sendAcademyWelcomeEmail(mockContext);

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'academy_value',
          status: 'pending',
          email: mockContext.email,
        })
      );
    });

    it('should schedule Day 7 demo email', async () => {
      await sendAcademyWelcomeEmail(mockContext);

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'academy_demo',
          status: 'pending',
          email: mockContext.email,
        })
      );
    });

    it('should handle missing firstName gracefully', async () => {
      const contextWithoutName = {
        ...mockContext,
        firstName: undefined,
      };

      const result = await sendAcademyWelcomeEmail(contextWithoutName);

      expect(result.success).toBe(true);
      expect(sendGenericEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Friend'),
        })
      );
    });

    it('should handle email send failure', async () => {
      (sendGenericEmail as jest.Mock).mockRejectedValueOnce(
        new Error('SMTP Error')
      );

      const result = await sendAcademyWelcomeEmail(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP Error');
    });
  });

  describe('sendAcademyValueEmail', () => {
    it('should send value email successfully', async () => {
      const result = await sendAcademyValueEmail(mockContext);

      expect(result.success).toBe(true);
      expect(sendGenericEmail).toHaveBeenCalled();
    });

    it('should use Thrive Syracuse case study subject', async () => {
      await sendAcademyValueEmail(mockContext);

      expect(sendGenericEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Thrive Syracuse'),
        })
      );
    });
  });

  describe('sendAcademyDemoEmail', () => {
    it('should send demo email successfully', async () => {
      const result = await sendAcademyDemoEmail(mockContext);

      expect(result.success).toBe(true);
      expect(sendGenericEmail).toHaveBeenCalled();
    });

    it('should include exclusive offer in subject', async () => {
      await sendAcademyDemoEmail(mockContext);

      expect(sendGenericEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Exclusive'),
        })
      );
    });
  });

  describe('Email Tracking', () => {
    it('should include tracking pixel in welcome email HTML', async () => {
      await sendAcademyWelcomeEmail(mockContext);

      const htmlBody = (sendGenericEmail as jest.Mock).mock.calls[0][0].htmlBody;
      expect(htmlBody).toContain('api/track/email/open');
      expect(htmlBody).toContain('type=welcome');
      expect(htmlBody).toContain(`leadId=${mockContext.leadId}`);
    });

    it('should include UTM parameters in welcome email links', async () => {
      await sendAcademyWelcomeEmail(mockContext);

      const htmlBody = (sendGenericEmail as jest.Mock).mock.calls[0][0].htmlBody;
      expect(htmlBody).toContain('utm_source=email');
      expect(htmlBody).toContain('utm_medium=welcome');
      expect(htmlBody).toContain('utm_campaign=academy');
    });

    it('should include tracking pixel in value email HTML', async () => {
      await sendAcademyValueEmail(mockContext);

      const htmlBody = (sendGenericEmail as jest.Mock).mock.calls[0][0].htmlBody;
      expect(htmlBody).toContain('type=value');
    });

    it('should include tracking pixel in demo email HTML', async () => {
      await sendAcademyDemoEmail(mockContext);

      const htmlBody = (sendGenericEmail as jest.Mock).mock.calls[0][0].htmlBody;
      expect(htmlBody).toContain('type=demo');
    });

    it('should include unsubscribe link with email parameter', async () => {
      await sendAcademyWelcomeEmail(mockContext);

      const htmlBody = (sendGenericEmail as jest.Mock).mock.calls[0][0].htmlBody;
      expect(htmlBody).toContain('unsubscribe');
      expect(htmlBody).toContain(encodeURIComponent(mockContext.email));
    });
  });

  describe('Letta Integration', () => {
    it('should save lead to Letta memory', async () => {
      const { archivalTagsService } = require('@/server/services/letta');

      await sendAcademyWelcomeEmail(mockContext);

      expect(archivalTagsService.insertWithTags).toHaveBeenCalled();
    });

    it('should continue if Letta save fails', async () => {
      const { archivalTagsService } = require('@/server/services/letta');
      archivalTagsService.insertWithTags.mockRejectedValueOnce(
        new Error('Letta unavailable')
      );

      const result = await sendAcademyWelcomeEmail(mockContext);

      // Should still succeed - Letta error is non-fatal
      expect(result.success).toBe(true);
    });

    it('should tag lead as high priority', async () => {
      const { archivalTagsService } = require('@/server/services/letta');

      await sendAcademyWelcomeEmail(mockContext);

      expect(archivalTagsService.insertWithTags).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tags: expect.arrayContaining(['priority:high']),
        })
      );
    });
  });
});

describe('Email Template Content', () => {
  const mockContext = {
    leadId: 'lead-456',
    email: 'template@example.com',
    firstName: 'Template',
    company: 'Template Inc',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should include academy resources in welcome email', async () => {
    await sendAcademyWelcomeEmail(mockContext);

    const htmlBody = (sendGenericEmail as jest.Mock).mock.calls[0][0].htmlBody;
    expect(htmlBody).toContain('12 episodes');
    expect(htmlBody).toContain('resource library');
  });

  it('should include Thrive Syracuse results in value email', async () => {
    await sendAcademyValueEmail(mockContext);

    const htmlBody = (sendGenericEmail as jest.Mock).mock.calls[0][0].htmlBody;
    expect(htmlBody).toContain('40%');
    expect(htmlBody).toContain('4,200');
  });

  it('should include 20% discount in demo email', async () => {
    await sendAcademyDemoEmail(mockContext);

    const htmlBody = (sendGenericEmail as jest.Mock).mock.calls[0][0].htmlBody;
    expect(htmlBody).toContain('20%');
    expect(htmlBody).toContain('offer=20off');
  });

  it('should include agent names in value email', async () => {
    await sendAcademyValueEmail(mockContext);

    const htmlBody = (sendGenericEmail as jest.Mock).mock.calls[0][0].htmlBody;
    expect(htmlBody).toContain('Smokey');
    expect(htmlBody).toContain('Craig');
    expect(htmlBody).toContain('Ezal');
    expect(htmlBody).toContain('Mrs. Parker');
  });

  it('should include urgency in demo email', async () => {
    await sendAcademyDemoEmail(mockContext);

    const htmlBody = (sendGenericEmail as jest.Mock).mock.calls[0][0].htmlBody;
    expect(htmlBody).toContain('expires');
    expect(htmlBody).toContain('7 days');
  });
});
