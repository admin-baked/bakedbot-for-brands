import { generateCampaignFromNL } from '../campaign-nlp';
import { requireUser } from '@/server/auth/auth';
import { callClaude } from '@/ai/claude';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/ai/claude', () => ({
  callClaude: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('campaign-nlp action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-1',
      orgId: 'org-1',
    });
  });

  it('returns a helpful error when prompt is empty', async () => {
    const result = await generateCampaignFromNL('   ');

    expect(result).toEqual({
      success: false,
      error: 'Please describe the campaign you want to create.',
    });
    expect(callClaude).not.toHaveBeenCalled();
  });

  it('parses fenced JSON and sanitizes enum fields from AI output', async () => {
    const longSms = 'x'.repeat(220);
    (callClaude as jest.Mock).mockResolvedValue(`\`\`\`json
{
  "name": "Win Back Weekend",
  "description": "Bring churned customers back this weekend.",
  "goal": "winback",
  "channels": ["email", "push", "sms", "sms"],
  "targetSegments": ["vip", "unknown", "churned", "at_risk", "loyal"],
  "audienceType": "all",
  "emailSubject": "",
  "emailBody": "Hi {{firstName}}, come back for 20% off this weekend.",
  "smsBody": "${longSms}"
}
\`\`\``);

    const result = await generateCampaignFromNL('Win back dormant customers this weekend');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.goal).toBe('winback');
      expect(result.data.channels).toEqual(['email', 'sms']);
      expect(result.data.targetSegments).toEqual(['vip', 'churned', 'at_risk']);
      expect(result.data.audienceType).toBe('segment');
      expect(result.data.emailSubject).toBe('Win Back Weekend');
      expect(result.data.smsBody.length).toBe(160);
    }
  });

  it('rejects AI output when goal is invalid', async () => {
    (callClaude as jest.Mock).mockResolvedValue(
      JSON.stringify({
        name: 'Bad Goal',
        goal: 'free_money',
        channels: ['email'],
        targetSegments: ['vip'],
        audienceType: 'segment',
        emailSubject: 'Hello',
        emailBody: 'Body',
        smsBody: 'SMS',
      }),
    );

    const result = await generateCampaignFromNL('Make me a campaign');

    expect(result).toEqual({
      success: false,
      error: 'AI response was incomplete. Please rephrase your description.',
    });
  });

  it('defaults to email channel when AI returns no valid channels', async () => {
    (callClaude as jest.Mock).mockResolvedValue(
      JSON.stringify({
        name: 'Email Fallback',
        description: 'Fallback test',
        goal: 'retention',
        channels: ['fax'],
        targetSegments: [],
        audienceType: 'segment',
        emailSubject: 'Retention Update',
        emailBody: 'Hello there!',
        smsBody: '',
      }),
    );

    const result = await generateCampaignFromNL('Retain recent customers');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channels).toEqual(['email']);
      expect(result.data.targetSegments).toEqual([]);
      expect(result.data.audienceType).toBe('all');
    }
  });
});
