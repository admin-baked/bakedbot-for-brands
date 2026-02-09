/**
 * Episode 4: Compliance as Competitive Moat
 *
 * Learning Objectives:
 * - Understand key compliance rules by state (TCPA, advertising restrictions)
 * - Learn how automated compliance checking prevents violations
 * - Discover how compliance creates competitive advantages
 * - See real examples of compliant vs. non-compliant marketing
 */

import type { EpisodePresentation, Slide } from '@/types/slides';

export const EPISODE_4_SLIDES: Slide[] = [
  // ============================================================
  // SLIDE 1: Title
  // ============================================================
  {
    id: 'ep4-title',
    type: 'title',
    episodeNumber: 4,
    title: 'Compliance as Competitive Moat',
    subtitle: 'Turn Regulations Into Advantages',
    trackColor: '#ef4444',
    notes: 'Compliance sounds boring, but it\'s actually a competitive advantage. This episode changes that perception.',
  },

  // ============================================================
  // SLIDE 2: Learning Objectives
  // ============================================================
  {
    id: 'ep4-objectives',
    type: 'objectives',
    title: 'What You\'ll Learn Today',
    objectives: [
      'Key compliance rules that trip up cannabis businesses',
      'How automated compliance checking prevents costly violations',
      'Why compliance creates a moat against competitors',
      'Real examples of compliant vs. non-compliant marketing',
    ],
    notes: 'Frame compliance as an opportunity, not a burden.',
  },

  // ============================================================
  // SLIDE 3: The Reality
  // ============================================================
  {
    id: 'ep4-reality',
    type: 'quote',
    quote: 'Compliance isn\'t the cost of doing business in cannabis. It\'s the barrier that protects serious operators from fly-by-night competitors.',
    attribution: 'BakedBot Philosophy',
    context: 'Turn your biggest challenge into your biggest advantage',
    notes: 'Set the tone - compliance is strategic, not just legal.',
  },

  // ============================================================
  // SLIDE 4: The Compliance Landscape
  // ============================================================
  {
    id: 'ep4-landscape',
    type: 'content',
    title: 'The Cannabis Compliance Maze',
    bullets: [
      'State-specific advertising rules (different in every market)',
      'TCPA regulations for SMS/calls (opt-in, opt-out, timing)',
      'Age-gating requirements (vary by state)',
      'Health claims restrictions (can\'t say "cures" or "treats")',
      'Platform policies (Meta, Google, TikTok all different)',
    ],
    highlight: 'One mistake can cost you your license, or worse.',
    notes: 'Establish the stakes. This is serious business.',
  },

  // ============================================================
  // SLIDE 5: Horror Story Stat
  // ============================================================
  {
    id: 'ep4-stat-1',
    type: 'stat',
    stat: '$500-$1,500',
    label: 'per violation for TCPA violations',
    context: 'Send 10,000 non-compliant SMS messages? That\'s up to $15 million in potential liability.',
    source: 'TCPA Penalty Guidelines',
    notes: 'Let the math sink in. This gets attention.',
  },

  // ============================================================
  // SLIDE 6: Common Violations
  // ============================================================
  {
    id: 'ep4-common-violations',
    type: 'split',
    title: 'Where Cannabis Businesses Get Burned',
    leftTitle: 'SMS/TCPA Violations',
    leftBullets: [
      'Messaging without explicit opt-in',
      'No clear opt-out mechanism',
      'Sending outside allowed hours',
      'Missing business identification',
      'Texting wrong types of content',
    ],
    rightTitle: 'Advertising Violations',
    rightBullets: [
      'Health/medical claims',
      'Targeting minors (imagery, language)',
      'Cross-state promotion',
      'Missing required disclaimers',
      'Using restricted platforms',
    ],
    notes: 'Be specific about what trips people up.',
  },

  // ============================================================
  // SLIDE 7: State-by-State Chaos
  // ============================================================
  {
    id: 'ep4-state-chaos',
    type: 'content',
    title: 'State-by-State Compliance Chaos',
    bullets: [
      'CALIFORNIA: No price discounts in ads, strict packaging rules',
      'COLORADO: 71.6% of ad audience must be 21+, no lifestyle imagery',
      'MICHIGAN: Can\'t show consumption, no cartoon characters',
      'NEW YORK: No outdoor advertising within 500ft of schools',
      'ILLINOIS: Time restrictions on digital ads, specific disclaimers',
    ],
    highlight: 'Multi-state operators? You need to know ALL of these.',
    notes: 'Show the complexity - this is hard to do manually.',
  },

  // ============================================================
  // SLIDE 8: Real Violation Examples
  // ============================================================
  {
    id: 'ep4-real-examples',
    type: 'comparison',
    title: 'Real Marketing: Compliant vs. Non-Compliant',
    beforeTitle: 'Non-Compliant (Risky)',
    beforeItems: [
      '"CBD oil CURES anxiety!"',
      'Cartoon mascot on packaging',
      '"20% off everything!" (CA)',
      'Texting at 11pm local time',
      'No business name in SMS',
    ],
    afterTitle: 'Compliant (Safe)',
    afterItems: [
      '"Customers report feeling more relaxed"',
      'Professional, age-appropriate branding',
      '"Member appreciation event"',
      'Texting 9am-8pm only',
      '"From [Business Name]: ..."',
    ],
    verdict: 'The second column builds a sustainable business.',
    notes: 'Make it concrete with real examples.',
  },

  // ============================================================
  // SLIDE 9: The Competitive Moat
  // ============================================================
  {
    id: 'ep4-moat',
    type: 'content',
    title: 'How Compliance Becomes Your Moat',
    bullets: [
      'Competitors who cut corners eventually get caught',
      'Regulators are getting MORE strict, not less',
      'MSOs look for compliant acquisition targets',
      'Banks and investors require compliance documentation',
      'Your license is your most valuable asset - protect it',
    ],
    highlight: 'The businesses that survive are the ones that play by the rules.',
    notes: 'Connect compliance to long-term business success.',
  },

  // ============================================================
  // SLIDE 10: Meet Deebo
  // ============================================================
  {
    id: 'ep4-deebo-intro',
    type: 'agent',
    agentId: 'deebo',
    agentName: 'Deebo the Enforcer',
    tagline: 'Your Compliance Safety Net',
    description: 'Deebo reviews every piece of marketing content before it goes out, checking against state-specific rules and TCPA requirements.',
    capabilities: [
      'Pre-flight compliance review for all content',
      'State-specific rule engine (updated as laws change)',
      'TCPA compliance verification for SMS campaigns',
      'Age-gate enforcement across all touchpoints',
    ],
    color: '#ef4444',
    icon: 'shield',
    notes: 'Introduce Deebo as the solution to the compliance problem.',
  },

  // ============================================================
  // SLIDE 11: How Deebo Works
  // ============================================================
  {
    id: 'ep4-deebo-workflow',
    type: 'content',
    title: 'Deebo\'s Pre-Flight Check',
    bullets: [
      '1. Craig drafts a campaign (email, SMS, or social)',
      '2. Deebo automatically reviews BEFORE sending',
      '3. Checks against YOUR state\'s specific rules',
      '4. Flags issues with specific remediation suggestions',
      '5. Only compliant content gets through',
    ],
    highlight: 'You can\'t accidentally send non-compliant content.',
    notes: 'Show the automated workflow.',
  },

  // ============================================================
  // SLIDE 12: Deebo Example
  // ============================================================
  {
    id: 'ep4-deebo-example',
    type: 'comparison',
    title: 'Deebo in Action',
    beforeTitle: 'Draft Message',
    beforeItems: [
      '"Flash sale! 30% off all flower!"',
      'Sending to: 5,000 subscribers',
      'Time: 10:30pm',
      'Missing: Business ID',
      '',
    ],
    afterTitle: 'Deebo\'s Feedback',
    afterItems: [
      '⚠️ CA: Price discounts not allowed in ads',
      '⚠️ TCPA: Outside permitted hours (8am-9pm)',
      '⚠️ TCPA: Missing business identification',
      '✅ Suggested: "Member appreciation event tonight!"',
      '✅ Auto-scheduled for 9am tomorrow',
    ],
    verdict: 'Caught 3 violations before they cost you anything.',
    notes: 'Concrete example of Deebo preventing real issues.',
  },

  // ============================================================
  // SLIDE 13: The Compliance Stack
  // ============================================================
  {
    id: 'ep4-compliance-stack',
    type: 'content',
    title: 'BakedBot Compliance Stack',
    bullets: [
      'Age verification at every entry point',
      'SMS opt-in/opt-out tracking with audit trail',
      'State-specific content rules engine',
      'TCPA timing enforcement',
      'Automated documentation for audits',
    ],
    highlight: 'Compliance is built into the platform, not bolted on.',
    notes: 'Position this as infrastructure, not features.',
  },

  // ============================================================
  // SLIDE 14: Audit-Ready
  // ============================================================
  {
    id: 'ep4-audit-ready',
    type: 'stat',
    stat: '100%',
    label: 'audit trail for every customer interaction',
    context: 'When regulators ask "did this customer opt in?", you have the answer in seconds.',
    notes: 'Emphasize documentation and auditability.',
  },

  // ============================================================
  // SLIDE 15: Demo
  // ============================================================
  {
    id: 'ep4-demo',
    type: 'demo',
    title: 'See Compliance in Action',
    description: 'Let me show you how Deebo catches compliance issues before they become problems.',
    instructions: [
      'Create a test campaign with a violation',
      'Watch Deebo flag the issue',
      'See the remediation suggestion',
      'Review the compliance audit log',
    ],
    notes: 'Live demo of Deebo catching a violation.',
  },

  // ============================================================
  // SLIDE 16: Your Action Items
  // ============================================================
  {
    id: 'ep4-actions',
    type: 'content',
    title: 'Compliance Checklist for Your Business',
    bullets: [
      '✓ Audit your current SMS opt-in process',
      '✓ Review all marketing for health claims',
      '✓ Verify age-gating on all entry points',
      '✓ Document your consent collection process',
      '✓ Know YOUR state\'s specific advertising rules',
    ],
    highlight: 'Download our Compliance Checklist below!',
    notes: 'Give them actionable next steps.',
  },

  // ============================================================
  // SLIDE 17: Recap
  // ============================================================
  {
    id: 'ep4-recap',
    type: 'recap',
    title: 'Key Takeaways',
    takeaways: [
      'Compliance is a competitive advantage, not just a cost',
      'TCPA violations can cost $500-$1,500 PER message',
      'State-by-state rules make manual compliance nearly impossible',
      'Deebo automates compliance checking for every campaign',
      'Your license is your most valuable asset - protect it',
    ],
    notes: 'Reinforce the business case for compliance.',
  },

  // ============================================================
  // SLIDE 18: CTA
  // ============================================================
  {
    id: 'ep4-cta',
    type: 'cta',
    title: 'Ready to Build Your Compliance Moat?',
    subtitle: 'Next up: Deep dive into our first agent...',
    primaryAction: 'Watch Episode 5',
    primaryUrl: '/academy?episode=ep5-smokey',
    secondaryAction: 'Download Compliance Checklist',
    secondaryUrl: '/academy?resource=res4-compliance-checklist',
    nextEpisodeTitle: 'Meet Smokey: AI-Powered Product Recommendations That Actually Work',
    notes: 'Transition to the agent deep dives starting with Smokey.',
  },
];

export const EPISODE_4_PRESENTATION: EpisodePresentation = {
  episodeId: 'ep4-compliance-moat',
  episodeNumber: 4,
  title: 'Compliance as Competitive Moat',
  track: 'deebo',
  trackColor: '#ef4444',
  estimatedDuration: 11,
  slides: EPISODE_4_SLIDES,
};
