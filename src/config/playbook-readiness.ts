/**
 * Playbook Readiness Classification
 *
 * Maps every playbook ID to its execution readiness label.
 * This is the canonical reference for catalog display, UI gating,
 * and drift-prevention checks.
 *
 * Labels are defined in: src/config/workflow-runtime.ts
 * ADR: .agent/refs/workflow-runtime-decision.md
 *
 * Maintenance:
 *   - Update when a playbook graduates from template_only → partial_support → executable_now
 *   - Run `scripts/check-playbook-drift.mjs` to verify all catalog IDs are classified
 *   - Do not remove entries — downgrade to 'legacy' if a playbook is deprecated
 */

import type { PlaybookReadiness } from './workflow-runtime';

// ---------------------------------------------------------------------------
// Classification map
// ---------------------------------------------------------------------------

/**
 * Readiness label for each playbook in the catalog.
 *
 * Classification criteria:
 *   executable_now  — cron job fires, real agent logic runs, output verified end-to-end in production
 *   partial_support — scheduling + framework exists; some steps are stubs or haven't been verified e2e
 *   template_only   — catalog entry only; no cron job or agent logic behind it yet
 *   experimental    — logic exists but may not complete reliably; do not enable for live customers
 *   legacy          — runs on V1 executor; maintained for compatibility only
 */
export const PLAYBOOK_READINESS: Record<string, PlaybookReadiness> = {

    // ── ONBOARDING ───────────────────────────────────────────────────────────

    // Craig + Mailjet email chain exists; event trigger wiring is a stub
    'welcome-sequence':         'partial_support',
    // Email template exists; owner.day3 event not wired to trigger
    'owner-quickstart-guide':   'template_only',
    // Smokey menu audit logic exists; menu.import_complete event not wired
    'menu-health-scan':         'partial_support',
    // 14-day email sequence scaffolded; CSM integration is placeholder
    'white-glove-onboarding':   'template_only',

    // ── ENGAGEMENT ───────────────────────────────────────────────────────────

    // Craig post-purchase email exists via Mailjet; order.post_purchase event wired
    'post-purchase-thank-you':  'partial_support',
    // Birthday cohort query + email exists; monthly schedule runs
    'birthday-loyalty-reminder': 'partial_support',
    // 30-day inactive detection + re-engagement email scaffolded; not verified e2e
    'win-back-sequence':        'template_only',
    // New product announcement email; inventory.new_product event not wired to trigger
    'new-product-launch':       'template_only',
    // Monthly VIP identification query + email exists; report not verified e2e
    'vip-customer-identification': 'template_only',

    // ── COMPETITIVE INTEL ────────────────────────────────────────────────────

    // Weekly cron fires; Ezal competitive snapshot generates and emails — verified
    'weekly-competitive-snapshot': 'executable_now',
    // Weekly cron fires; full pricing data via Rtrvr; verified for Thrive
    'pro-competitive-brief':    'executable_now',
    // Daily cron fires; 10-competitor scan runs via Rtrvr; partial gaps in menu shakeup detection
    'daily-competitive-intel':  'partial_support',
    // Rtrvr price monitoring exists; real-time SMS alert via Blackleaf is a stub
    'real-time-price-alerts':   'experimental',

    // ── COMPLIANCE ───────────────────────────────────────────────────────────

    // Weekly compliance digest cron runs; Deebo logic generates report
    'weekly-compliance-digest': 'partial_support',
    // Pre-send check via Deebo is integrated in campaign flow
    'pre-send-campaign-check':  'partial_support',
    // Jurisdiction change detection is a stub; alert email exists
    'jurisdiction-change-alert': 'template_only',
    // Quarterly audit package; log export exists; not verified end-to-end
    'audit-prep-automation':    'template_only',

    // ── ANALYTICS ────────────────────────────────────────────────────────────

    // Weekly snapshot from Big Worm runs; Alleaves data now flowing
    'weekly-performance-snapshot': 'partial_support',
    // Monthly ROI report; revenue attribution system exists; not verified e2e
    'campaign-roi-report':      'template_only',
    // Multi-agent daily digest — cron exists but multi-agent rollup is stub
    'executive-daily-digest':   'partial_support',
    // Multi-location rollup; MSO data model exists; not yet verified for multi-location orgs
    'multi-location-rollup':    'template_only',

    // ── SEASONAL ─────────────────────────────────────────────────────────────

    // Quarterly campaign pack — template generation exists; seasonal trigger is stub
    'seasonal-template-pack':   'template_only',

    // ── SYSTEM ───────────────────────────────────────────────────────────────

    // Usage alert event not yet wired to monitoring pipeline
    'usage-alert':              'template_only',
    // Upgrade nudge email exists; feature ceiling event detection is stub
    'tier-upgrade-nudge':       'template_only',

    // ── NATURAL LANGUAGE PLAYBOOKS ───────────────────────────────────────────

    // Verified weekly: Ezal deep-dive fires, emails martez@bakedbot.ai
    'flnnstoned-competitive-deep-dive': 'executable_now',
    // Daily end-of-day sales recap; Big Worm + Alleaves data runs; verified for Thrive
    'daily-sales-highlights':   'executable_now',
    // Sub-daily revenue threshold check — cron fires every 15 min; alert dedup logic runs
    'revenue-pace-alert':       'partial_support',
    // Weekly loyalty health — Craig + Alleaves LTV data; runs Monday; verified for Thrive
    'weekly-loyalty-health':    'executable_now',
    // Daily check-in digest — runs end-of-day; verified for Thrive tablet pipeline
    'daily-checkin-digest':     'partial_support',

    // ── TIER PLAYBOOK TEMPLATES ───────────────────────────────────────────────
    // Assigned via TIER_PLAYBOOK_TEMPLATES; seeded to playbook_templates collection

    // Pro: Daily competitive intel via Ezal — same as daily-competitive-intel pipeline
    'pro-daily-competitive-intel': 'partial_support',
    // Pro: Weekly campaign ROI analysis — stub; no ROI attribution verified e2e
    'pro-campaign-analyzer':    'template_only',
    // Pro: Dynamic bundle pricing — speculative; pricing engine is placeholder
    'pro-revenue-optimizer':    'experimental',
    // Enterprise: Hourly Ezal + Rtrvr — experimental; Rtrvr reliability under load unverified
    'enterprise-realtime-intel': 'experimental',
    // Enterprise: Daily exec digest — same as executive-daily-digest; partial
    'enterprise-account-summary': 'partial_support',
    // Enterprise: Integration health monitor — cron runs; alert logic exists
    'enterprise-integration-health': 'partial_support',
    // Enterprise: Partner ecosystem — fully placeholder
    'enterprise-custom-integrations': 'template_only',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the readiness label for a playbook.
 * Returns 'template_only' as the safe default for unclassified playbooks.
 */
export function getPlaybookReadiness(playbookId: string): PlaybookReadiness {
    return PLAYBOOK_READINESS[playbookId] ?? 'template_only';
}

/**
 * Get all playbook IDs with a given readiness label.
 */
export function getPlaybooksByReadiness(readiness: PlaybookReadiness): string[] {
    return Object.entries(PLAYBOOK_READINESS)
        .filter(([, r]) => r === readiness)
        .map(([id]) => id);
}

/**
 * Summary counts by readiness label — useful for admin dashboards and drift checks.
 */
export function getReadinessSummary(): Record<PlaybookReadiness, number> {
    const summary: Record<PlaybookReadiness, number> = {
        executable_now: 0,
        partial_support: 0,
        template_only: 0,
        experimental: 0,
        legacy: 0,
    };
    for (const readiness of Object.values(PLAYBOOK_READINESS)) {
        summary[readiness]++;
    }
    return summary;
}
