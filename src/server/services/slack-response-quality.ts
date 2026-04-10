import type { SlackResponseRecord } from './slack-response-archive';
import { isGreeting, isMartyShortAcknowledgment } from './slack-agent-routing';

export type SlackQualityIssueKey =
  | 'greeting_metric_dump'
  | 'short_ack_blocked_escalation'
  | 'blocked_no_next_step'
  | 'sales_lookup_miss'
  | 'past_date_future_confusion';

export interface SlackQualityIssue {
  key: SlackQualityIssueKey;
  summary: string;
  proposedFix: string;
}

const MARTY_STATUS_METRIC_RE = /\b(pipeline|crm|prospects?|mrr|arr|revenue|customers?)\b/i;
const MARTY_BLOCKED_LANGUAGE_RE = /\b(blocked|authorization error|authentication problem|auth problem|session error|unable to delegate|wait for further instructions|notified the ceo|ask linus for help)\b/i;
const GENERIC_BLOCKED_LANGUAGE_RE = /\b(blocked|authorization error|authentication problem|auth problem|permission denied|need approval|need access|cannot access|can't access|unable to|waiting for further instructions|stuck)\b/i;
const NEXT_STEP_SIGNAL_RE = /\?|want me|i can|next step|reply with|send me|share|approve|grant|once you|if you|i'll keep|i'll continue|i can keep moving/i;
const ELROY_SALES_LOOKUP_RE = /\b(top seller|top sellers|gross sales|sales|transactions?|recent orders|last \d+)\b/i;
const ELROY_SALES_DATA_MISS_RE = /\bno product sales data(?: found| available)?\b/i;
const PAST_TIME_REFERENCE_RE = /\b(yesterday|last \d+|recent|january|february|march|april|may|june|july|august|september|october|november|december|202\d)\b/i;
const FUTURE_CONFUSION_RE = /\b(can't|cannot|unable to).*(future|that far in the future)\b/i;

export function detectSlackResponseIssues(
  agentId: string,
  record: Pick<SlackResponseRecord, 'userMessage' | 'agentResponse'>
): SlackQualityIssue[] {
  const normalizedAgentId = String(agentId || '').trim().toLowerCase();
  const userMessage = String(record.userMessage || '').trim();
  const agentResponse = String(record.agentResponse || '').trim();
  const issues: SlackQualityIssue[] = [];

  if (
    normalizedAgentId === 'marty'
    && isGreeting(userMessage)
    && /\d/.test(agentResponse)
    && MARTY_STATUS_METRIC_RE.test(agentResponse)
  ) {
    issues.push({
      key: 'greeting_metric_dump',
      summary: 'Marty volunteered pipeline or revenue-style metrics in response to a bare greeting.',
      proposedFix: 'Keep bare greetings warm and forward-moving. Only share metrics when the user explicitly asks for status.',
    });
  }

  if (
    normalizedAgentId === 'marty'
    && isMartyShortAcknowledgment(userMessage)
    && MARTY_BLOCKED_LANGUAGE_RE.test(agentResponse)
  ) {
    issues.push({
      key: 'short_ack_blocked_escalation',
      summary: 'Marty answered a short acknowledgment with blocked, auth, or escalation language instead of keeping momentum.',
      proposedFix: 'Treat short acknowledgments as conversational follow-through. Suggest the next growth move before escalating technical blockers.',
    });
  }

  if (
    GENERIC_BLOCKED_LANGUAGE_RE.test(agentResponse)
    && !NEXT_STEP_SIGNAL_RE.test(agentResponse)
  ) {
    issues.push({
      key: 'blocked_no_next_step',
      summary: 'The Slack reply surfaced a blocker but did not give the user a concrete next step or offer.',
      proposedFix: 'When blocked, explain the blocker briefly and end with a concrete next step, request, or owner handoff the user can act on.',
    });
  }

  if (
    normalizedAgentId === 'elroy'
    && ELROY_SALES_LOOKUP_RE.test(userMessage)
    && ELROY_SALES_DATA_MISS_RE.test(agentResponse)
  ) {
    issues.push({
      key: 'sales_lookup_miss',
      summary: 'Elroy missed a grounded sales lookup and answered with a generic no-data response.',
      proposedFix: 'Use the sales lookup tools for top sellers, transactions, and dated revenue questions before falling back to no-data language.',
    });
  }

  if (
    normalizedAgentId === 'elroy'
    && PAST_TIME_REFERENCE_RE.test(userMessage)
    && FUTURE_CONFUSION_RE.test(agentResponse)
  ) {
    issues.push({
      key: 'past_date_future_confusion',
      summary: 'Elroy treated an explicit past date or month as if it were in the future.',
      proposedFix: 'Anchor dated questions to absolute calendar lookups and use past-month/date tools instead of future-language refusals.',
    });
  }

  return issues;
}

export type MartySlackQualityIssueKey = Extract<
  SlackQualityIssueKey,
  'greeting_metric_dump' | 'short_ack_blocked_escalation'
>;

export interface MartySlackQualityIssue extends SlackQualityIssue {
  key: MartySlackQualityIssueKey;
}

export function detectMartySlackResponseIssues(
  record: Pick<SlackResponseRecord, 'userMessage' | 'agentResponse'>
): MartySlackQualityIssue[] {
  return detectSlackResponseIssues('marty', record)
    .filter((issue): issue is MartySlackQualityIssue =>
      issue.key === 'greeting_metric_dump' || issue.key === 'short_ack_blocked_escalation'
    );
}
