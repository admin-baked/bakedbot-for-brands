import { logger } from '@/lib/logger';
import type { AITextTaskClass } from '@/types/ai-routing';

export const SLACK_LINUS_APP_ID = process.env.SLACK_LINUS_APP_ID;
export const SLACK_ELROY_APP_ID = process.env.SLACK_ELROY_APP_ID;
export const SLACK_MARTY_APP_ID = process.env.SLACK_MARTY_APP_ID;

const GREETING_RE = /^(h(i|ello|ey|owdy)|what'?s?\s*up|yo+|sup|gm|good\s*(morning|evening|afternoon)|what\s*it\s*do|greetings|salutations|peace|thanks|ty|thank\s*you)\b/i;
const MAX_GREETING_LENGTH = 60;
const MARTY_SHORT_ACK_RE = /^(me too|same here|same|sounds good|sound good|lets do it|let's do it|i agree|agree|exactly|for sure|nice|cool|great|awesome|perfect|love it|that works|works for me|makes sense)[\s!?.]*$/i;

const KEYWORD_MAP: Array<{ keywords: string[]; personaId: string }> = [
  { keywords: ['marty', 'ceo', 'strategy', 'north star', 'arr goal'], personaId: 'marty' },
  { keywords: ['leo', 'coo', 'operations', 'ops'], personaId: 'leo' },
  { keywords: ['linus', 'cto', 'tech', 'build', 'code', 'deploy', 'bug', 'error', 'fix', 'broken', 'timeout', 'slow', 'latency'], personaId: 'linus' },
  { keywords: ['jack', 'cro', 'revenue', 'sales', 'pipeline', 'deal'], personaId: 'jack' },
  { keywords: ['glenda', 'cmo', 'brand', 'marketing'], personaId: 'glenda' },
  { keywords: ['ezal', 'intel', 'competitive', 'lookout', 'competitor'], personaId: 'ezal' },
  { keywords: ['craig', 'social', 'campaign', 'post', 'content'], personaId: 'craig' },
  { keywords: ['pops', 'analytics', 'data', 'report', 'metrics'], personaId: 'pops' },
  { keywords: ['smokey', 'products', 'menu', 'inventory', 'strains'], personaId: 'smokey' },
  { keywords: ['parker', 'loyalty', 'customers', 'retention', 'email'], personaId: 'mrs_parker' },
  { keywords: ['deebo', 'compliance', 'legal', 'regulation'], personaId: 'deebo' },
  { keywords: ['mike', 'finance', 'profitability', 'margins', 'tax', 'cfo'], personaId: 'money_mike' },
  { keywords: ['bigworm', 'research', 'market'], personaId: 'bigworm' },
  { keywords: ['day_day', 'dayday', 'growth', 'acquisition', 'leads'], personaId: 'day_day' },
  { keywords: ['felisha', 'fulfillment', 'delivery', 'driver'], personaId: 'felisha' },
  { keywords: ['elroy', 'uncle elroy', 'store ops', 'thrive'], personaId: 'elroy' },
];

const CHANNEL_MAP: Array<{ prefix: string; personaId: string }> = [
  { prefix: 'marty', personaId: 'marty' },
  { prefix: 'ceo', personaId: 'marty' },
  { prefix: 'linus', personaId: 'linus' },
  { prefix: 'leo', personaId: 'leo' },
  { prefix: 'jack', personaId: 'jack' },
  { prefix: 'glenda', personaId: 'glenda' },
  { prefix: 'ezal', personaId: 'ezal' },
  { prefix: 'craig', personaId: 'craig' },
  { prefix: 'intel', personaId: 'ezal' },
  { prefix: 'cto', personaId: 'linus' },
  { prefix: 'coo', personaId: 'leo' },
  { prefix: 'cro', personaId: 'jack' },
  { prefix: 'thrive-syracuse', personaId: 'elroy' },
];

export function isGreeting(text: string): boolean {
  return text.length <= MAX_GREETING_LENGTH && GREETING_RE.test(text.trim());
}

export function isMartyShortAcknowledgment(text: string): boolean {
  return text.length <= 80 && MARTY_SHORT_ACK_RE.test(text.trim());
}

export function getSlackGLMSynthesisTask(_personaId: string): AITextTaskClass {
  return 'standard';
}

export function stripBotMention(text: string): string {
  return text.replace(/<@[A-Z0-9]+>/g, '').trim();
}

export function extractMentions(text: string): string[] {
  const matches = Array.from(text.matchAll(/<@([A-Z0-9]+)>/g));
  return matches.map((match) => match[1]);
}

export function detectAgent(text: string, channelName: string, isDm: boolean, appId?: string): string {
  const lower = text.toLowerCase();

  if (SLACK_MARTY_APP_ID && appId && appId === SLACK_MARTY_APP_ID) {
    logger.info(`[SlackBridge] detectAgent -> Tier0(marty app_id) -> marty | appId="${appId}"`);
    return 'marty';
  }
  if (SLACK_LINUS_APP_ID && appId && appId === SLACK_LINUS_APP_ID) {
    logger.info(`[SlackBridge] detectAgent -> Tier0(linus app_id) -> linus | appId="${appId}"`);
    return 'linus';
  }
  if (SLACK_ELROY_APP_ID && appId && appId === SLACK_ELROY_APP_ID) {
    logger.info(`[SlackBridge] detectAgent -> Tier0(elroy app_id) -> elroy | appId="${appId}"`);
    return 'elroy';
  }

  if (/\b(what|which)\s+model\b|\bmodel\s+are\s+you\s+using\b|\bwhat\s+are\s+you\s+running\s+on\b/i.test(lower)) {
    logger.info(`[SlackBridge] detectAgent -> Tier0(runtime question) -> linus | channel="${channelName}"`);
    return 'linus';
  }

  const explicitNames = [
    'marty', 'leo', 'linus', 'jack', 'glenda', 'ezal', 'craig',
    'pops', 'smokey', 'parker', 'deebo', 'mike', 'bigworm',
    'day_day', 'dayday', 'felisha', 'elroy',
  ];

  for (const { keywords, personaId } of KEYWORD_MAP) {
    if (keywords.some((keyword) => explicitNames.includes(keyword) && lower.includes(keyword))) {
      logger.info(`[SlackBridge] detectAgent -> Tier1(explicit name) -> ${personaId} | channel="${channelName}"`);
      return personaId;
    }
  }

  const channelLower = (channelName || '').toLowerCase();
  for (const { prefix, personaId } of CHANNEL_MAP) {
    if (channelLower.startsWith(prefix)) {
      logger.info(`[SlackBridge] detectAgent -> Tier2(channel prefix "${prefix}") -> ${personaId} | channel="${channelName}"`);
      return personaId;
    }
  }

  const genericKeywords = [
    'operations', 'ops', 'tech', 'build', 'code', 'deploy', 'bug', 'error', 'fix', 'broken', 'timeout', 'slow', 'latency',
    'revenue', 'sales', 'pipeline', 'deal', 'brand', 'marketing',
    'intel', 'competitive', 'lookout', 'competitor', 'social', 'campaign',
    'post', 'content', 'analytics', 'data', 'report', 'metrics',
    'products', 'menu', 'inventory', 'strains', 'loyalty', 'customers',
    'retention', 'email', 'compliance', 'legal', 'regulation',
    'finance', 'profitability', 'margins', 'tax', 'research', 'market',
    'growth', 'acquisition', 'leads', 'fulfillment', 'delivery', 'driver',
  ];

  for (const { keywords, personaId } of KEYWORD_MAP) {
    const matchedKeyword = keywords.find((keyword) => genericKeywords.includes(keyword) && lower.includes(keyword));
    if (matchedKeyword) {
      logger.info(`[SlackBridge] detectAgent -> Tier3(keyword "${matchedKeyword}") -> ${personaId} | channel="${channelName}"`);
      return personaId;
    }
  }

  const defaultAgent = isDm ? 'linus' : 'puff';
  logger.info(`[SlackBridge] detectAgent -> Tier4(default) -> ${defaultAgent} | channel="${channelName}" isDm=${isDm}`);
  return defaultAgent;
}
