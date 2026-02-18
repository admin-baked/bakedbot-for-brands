/**
 * TIER PLAYBOOK TEMPLATES
 *
 * Maps subscription tiers → pre-built playbook templates.
 * Single source of truth for tier-based template assignment.
 *
 * Architecture:
 * - playbook_templates collection = reusable template blueprints
 * - Tier upgrades trigger assignment of template IDs to org
 * - Each assigned template auto-creates a playbook instance in org's subcollection
 *
 * Scaling for New Pilot Customers:
 * 1. Create new templates in pro-tier-playbooks.ts
 * 2. Run seeding script: node scripts/seed-tier-playbooks.mjs
 * 3. Add template IDs here
 * 4. Tier assignments happen automatically via this map
 */

export const TIER_PLAYBOOK_TEMPLATES = {
  scout: [
    // Scout gets existing playbooks (no new tier templates)
  ],

  pro: [
    // Pro Tier Playbook Templates (3 total)
    // All scheduled + event-triggered automation
    'pro-daily-competitive-intel',      // Daily competitor monitoring
    'pro-campaign-analyzer',             // Weekly ROI analysis
    'pro-revenue-optimizer',             // Dynamic bundle pricing
  ],

  growth: [
    // Growth tier includes Pro templates + adds its own
    // (inherit Pro templates via assignment logic)
  ],

  enterprise: [
    // Enterprise Tier Playbook Templates (4 total)
    // Real-time, multi-location, integration-focused
    'enterprise-realtime-intel',         // Hourly competitor tracking
    'enterprise-account-summary',        // Daily executive digest
    'enterprise-integration-health',     // API usage monitoring
    'enterprise-custom-integrations',    // Partner ecosystem manager
  ],
} as const;

/**
 * Template Metadata
 * Documents tier, frequency, triggers, agents for each template
 */
export const PLAYBOOK_TEMPLATE_METADATA = {
  'pro-daily-competitive-intel': {
    tier: 'pro',
    name: '📊 Daily Competitive Intel',
    frequency: 'daily',
    triggers: ['schedule'],
    agents: ['ezal'],
    channels: ['email'],
  },
  'pro-campaign-analyzer': {
    tier: 'pro',
    name: '📈 Weekly Campaign Performance',
    frequency: 'weekly',
    triggers: ['schedule'],
    agents: ['craig', 'linus'],
    channels: ['email'],
  },
  'pro-revenue-optimizer': {
    tier: 'pro',
    name: '💰 Revenue Optimization Weekly',
    frequency: 'weekly',
    triggers: ['schedule'],
    agents: ['smokey', 'craig'],
    channels: ['email'],
  },
  'enterprise-realtime-intel': {
    tier: 'enterprise',
    name: '⚡ Real-Time Competitive Intelligence',
    frequency: 'hourly',
    triggers: ['schedule', 'order.created', 'inventory.low_stock'],
    agents: ['ezal'],
    channels: ['email', 'slack'],
  },
  'enterprise-account-summary': {
    tier: 'enterprise',
    name: '🏢 Daily Executive Summary',
    frequency: 'daily',
    triggers: ['schedule'],
    agents: ['linus'],
    channels: ['email'],
  },
  'enterprise-integration-health': {
    tier: 'enterprise',
    name: '🔗 Integration Health Monitor',
    frequency: 'daily',
    triggers: ['schedule'],
    agents: ['linus'],
    channels: ['email', 'slack'],
  },
  'enterprise-custom-integrations': {
    tier: 'enterprise',
    name: '🔌 Partner Ecosystem Manager',
    frequency: 'weekly',
    triggers: ['schedule'],
    agents: ['linus'],
    channels: ['email'],
  },
} as const;

/**
 * Get all templates for a tier (including tier hierarchy)
 * Pro tier gets Pro templates
 * Growth tier gets Pro + Growth
 * Enterprise tier gets Enterprise
 */
export function getTemplatesForTier(tier: 'scout' | 'pro' | 'growth' | 'enterprise') {
  const templates: string[] = [];

  // Add tier-specific templates
  if (tier === 'pro') {
    templates.push(...TIER_PLAYBOOK_TEMPLATES.pro);
  } else if (tier === 'growth') {
    // Growth includes Pro templates
    templates.push(...TIER_PLAYBOOK_TEMPLATES.pro);
  } else if (tier === 'enterprise') {
    templates.push(...TIER_PLAYBOOK_TEMPLATES.enterprise);
  }

  return templates;
}
