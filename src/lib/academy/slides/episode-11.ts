/**
 * Episode 11: Deebo Deep Dive - Advanced Compliance Automation
 *
 * Learning Objectives:
 * - Understand TCPA compliance for SMS marketing
 * - Learn state-by-state advertising restrictions
 * - Discover how automated compliance checking works under the hood
 * - See how Deebo prevents violations before they happen
 */

import type { EpisodePresentation, Slide } from '@/types/slides';

export const EPISODE_11_SLIDES: Slide[] = [
  // ============================================================
  // SLIDE 1: Title
  // ============================================================
  {
    id: 'ep11-title',
    type: 'title',
    episodeNumber: 11,
    title: 'Deebo Deep Dive',
    subtitle: 'Advanced Compliance Automation',
    trackColor: '#ef4444',
    notes: 'Episode 4 was intro. This is the technical deep dive.',
  },

  // ============================================================
  // SLIDE 2: Learning Objectives
  // ============================================================
  {
    id: 'ep11-objectives',
    type: 'objectives',
    title: 'What You\'ll Learn Today',
    objectives: [
      'TCPA compliance deep dive for SMS marketing',
      'State-by-state advertising restrictions in detail',
      'How Deebo\'s compliance engine works under the hood',
      'Preventing violations before they happen',
    ],
    notes: 'Technical compliance episode for serious operators.',
  },

  // ============================================================
  // SLIDE 3: TCPA Overview
  // ============================================================
  {
    id: 'ep11-tcpa-overview',
    type: 'content',
    title: 'TCPA 101: The Law That Can Sink You',
    bullets: [
      'Telephone Consumer Protection Act (1991, updated)',
      'Regulates unsolicited calls, texts, and faxes',
      'Requires EXPRESS WRITTEN CONSENT for marketing',
      'Violations: $500-$1,500 PER MESSAGE',
      'Class actions can reach tens of millions',
    ],
    highlight: 'This isn\'t theory. Dispensaries have been sued.',
    notes: 'Set up the seriousness of TCPA.',
  },

  // ============================================================
  // SLIDE 4: Consent Requirements
  // ============================================================
  {
    id: 'ep11-consent',
    type: 'content',
    title: 'What "Consent" Actually Means',
    bullets: [
      'WRITTEN consent (checkbox, form, etc.)',
      'Clear disclosure of what they\'re signing up for',
      'Must include your business name',
      'Must explain message frequency',
      'Must explain how to opt out',
    ],
    highlight: '"I gave you my phone number" is NOT consent.',
    notes: 'Be very specific about consent requirements.',
  },

  // ============================================================
  // SLIDE 5: Consent Example
  // ============================================================
  {
    id: 'ep11-consent-example',
    type: 'comparison',
    title: 'Consent Language: Good vs. Bad',
    beforeTitle: 'Bad (Insufficient)',
    beforeItems: [
      '☐ Send me text messages',
      '(No business name)',
      '(No frequency mention)',
      '(No opt-out instructions)',
      '(Vague purpose)',
    ],
    afterTitle: 'Good (Compliant)',
    afterItems: [
      '☐ I agree to receive promotional SMS from [Business Name]',
      'Message frequency varies. Msg & data rates may apply.',
      'Reply STOP to unsubscribe.',
      'By checking this box, you consent to receive marketing texts.',
      'See our Privacy Policy for details.',
    ],
    verdict: 'Deebo checks your consent language automatically.',
    notes: 'Show concrete before/after.',
  },

  // ============================================================
  // SLIDE 6: Timing Rules
  // ============================================================
  {
    id: 'ep11-timing',
    type: 'content',
    title: 'TCPA Timing Requirements',
    bullets: [
      'Marketing messages: 8am - 9pm LOCAL TIME',
      'Not YOUR time zone - RECIPIENT\'S time zone',
      'Includes weekends (same hours)',
      'Emergency/service messages have more flexibility',
      'Deebo auto-blocks messages outside these hours',
    ],
    highlight: 'One 10pm text = $500-$1,500 per recipient.',
    notes: 'Timing is a common violation.',
  },

  // ============================================================
  // SLIDE 7: Opt-Out Handling
  // ============================================================
  {
    id: 'ep11-optout',
    type: 'content',
    title: 'Opt-Out: The Non-Negotiable',
    bullets: [
      'Must honor STOP, UNSUBSCRIBE, CANCEL, END, QUIT',
      'Must honor within reasonable time (industry: immediately)',
      'Cannot require calling/emailing to opt out',
      'Cannot charge for opting out',
      'Must confirm opt-out was received',
    ],
    highlight: 'Deebo processes opt-outs automatically and instantly.',
    notes: 'Opt-out handling is critical.',
  },

  // ============================================================
  // SLIDE 8: State Advertising Rules
  // ============================================================
  {
    id: 'ep11-state-rules',
    type: 'content',
    title: 'State-by-State: The Patchwork',
    bullets: [
      'CALIFORNIA: No price discounts in ads, strict packaging',
      'COLORADO: 71.6% adult audience, no lifestyle imagery',
      'MASSACHUSETTS: 85% adult audience, no outdoor within 500ft of schools',
      'MICHIGAN: No consumption shown, no cartoon characters',
      'NEW YORK: Pre-approval required for some ads',
    ],
    highlight: 'Multi-state operators: You need to know ALL of these.',
    notes: 'Highlight the complexity.',
  },

  // ============================================================
  // SLIDE 9: Health Claims
  // ============================================================
  {
    id: 'ep11-health-claims',
    type: 'comparison',
    title: 'Health Claims: What You Can\'t Say',
    beforeTitle: 'ILLEGAL Health Claims',
    beforeItems: [
      '"CBD cures anxiety"',
      '"Cannabis treats chronic pain"',
      '"Helps with PTSD"',
      '"Medical benefits proven"',
      '"Doctor recommended"',
    ],
    afterTitle: 'LEGAL Alternative Language',
    afterItems: [
      '"Customers report feeling more relaxed"',
      '"Many find relief with..."',
      '"Popular with customers seeking calm"',
      '"Wellness-focused products"',
      '"Consult your physician"',
    ],
    verdict: 'Deebo flags health claims and suggests alternatives.',
    notes: 'Health claims are a major violation area.',
  },

  // ============================================================
  // SLIDE 10: How Deebo Works
  // ============================================================
  {
    id: 'ep11-deebo-engine',
    type: 'content',
    title: 'Inside Deebo\'s Compliance Engine',
    bullets: [
      '1. Content submitted (email, SMS, or social post)',
      '2. AI scans for known violation patterns',
      '3. Checks against state-specific rule database',
      '4. Verifies TCPA requirements met',
      '5. Returns: APPROVED, NEEDS REVISION, or BLOCKED',
    ],
    highlight: 'Happens in under 2 seconds. Every single time.',
    notes: 'Show the technical workflow.',
  },

  // ============================================================
  // SLIDE 11: Rule Database
  // ============================================================
  {
    id: 'ep11-rule-database',
    type: 'content',
    title: 'The Compliance Rule Database',
    bullets: [
      'State advertising regulations (all 50 states)',
      'TCPA requirements',
      'Platform policies (Meta, Google, TikTok)',
      'Health claim restrictions',
      'Updated as laws change',
    ],
    highlight: 'You don\'t have to track law changes. Deebo does.',
    notes: 'The value of automated updates.',
  },

  // ============================================================
  // SLIDE 12: Demo
  // ============================================================
  {
    id: 'ep11-demo',
    type: 'demo',
    title: 'Watch Deebo Catch Violations',
    description: 'Let\'s submit content with violations and see Deebo in action.',
    instructions: [
      'Create a test campaign with a health claim',
      'Watch Deebo flag the issue',
      'See the suggested alternative language',
      'Submit compliant content and see approval',
      'Review the compliance audit log',
    ],
    notes: 'Live demo of violation detection.',
  },

  // ============================================================
  // SLIDE 13: Audit Trail
  // ============================================================
  {
    id: 'ep11-audit-trail',
    type: 'content',
    title: 'The Audit Trail: Your Protection',
    bullets: [
      'Every consent recorded with timestamp',
      'Every message logged with content and recipient',
      'Every opt-out processed and documented',
      'Every compliance check saved',
      'Exportable for legal/regulatory review',
    ],
    highlight: 'When (not if) you get audited, you\'re ready.',
    notes: 'Audit trails as insurance.',
  },

  // ============================================================
  // SLIDE 14: Prevention Stats
  // ============================================================
  {
    id: 'ep11-prevention-stats',
    type: 'stat',
    stat: '127',
    label: 'violations prevented per month (average across clients)',
    context: 'Each one could have been a $500+ fine. Math: $63,500/month protected.',
    notes: 'Quantify the value of prevention.',
  },

  // ============================================================
  // SLIDE 15: Best Practices
  // ============================================================
  {
    id: 'ep11-best-practices',
    type: 'content',
    title: 'Compliance Best Practices',
    bullets: [
      'Always get written consent BEFORE texting',
      'Keep consent records forever',
      'Process opt-outs immediately',
      'Review state rules before expanding to new markets',
      'Use Deebo\'s pre-flight check on EVERY message',
    ],
    highlight: 'Compliance is a process, not a checkbox.',
    notes: 'Actionable best practices.',
  },

  // ============================================================
  // SLIDE 16: Recap
  // ============================================================
  {
    id: 'ep11-recap',
    type: 'recap',
    title: 'Key Takeaways',
    takeaways: [
      'TCPA requires express written consent for marketing texts',
      'Timing matters: 8am-9pm in recipient\'s time zone',
      'Opt-out must be honored immediately',
      'State rules vary wildly - know your markets',
      'Deebo checks every message automatically',
    ],
    notes: 'Reinforce compliance essentials.',
  },

  // ============================================================
  // SLIDE 17: Resources
  // ============================================================
  {
    id: 'ep11-resources',
    type: 'content',
    title: 'Your Compliance Toolkit',
    bullets: [
      'TCPA Compliance Guide for Cannabis SMS',
      'State-by-State Advertising Rules Reference',
      'Consent Language Templates',
      'Compliance Audit Checklist',
      'Download from the Resources tab!',
    ],
    highlight: 'Stay compliant. Stay in business.',
    notes: 'Point to resources.',
  },

  // ============================================================
  // SLIDE 18: CTA
  // ============================================================
  {
    id: 'ep11-cta',
    type: 'cta',
    title: 'Ready to Bulletproof Your Compliance?',
    subtitle: 'Final episode: See how all 7 agents work together...',
    primaryAction: 'Watch Episode 12',
    primaryUrl: '/academy?episode=ep12-full-stack',
    secondaryAction: 'Download TCPA Guide',
    secondaryUrl: '/academy?resource=res13-tcpa-guide',
    nextEpisodeTitle: 'The Full Stack: How All 7 Agents Work Together',
    notes: 'Build anticipation for the finale.',
  },
];

export const EPISODE_11_PRESENTATION: EpisodePresentation = {
  episodeId: 'ep11-deebo-advanced',
  episodeNumber: 11,
  title: 'Deebo Deep Dive: Advanced Compliance Automation',
  track: 'deebo',
  trackColor: '#ef4444',
  estimatedDuration: 15,
  slides: EPISODE_11_SLIDES,
};
