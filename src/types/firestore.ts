/**
 * firestore.ts - Firestore Document Types
 *
 * Type definitions for all Firestore collections used in the app.
 * Keep these in sync with Firestore schema and security rules.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * SUBSCRIPTIONS COLLECTION
 *
 * Stores billing & tier information for each customer.
 * One doc per customer, keyed by customerId.
 */
export interface Subscription {
  id: string;
  customerId: string;
  tierId: 'scout' | 'pro' | 'growth' | 'empire';
  status: 'active' | 'trial' | 'past_due' | 'canceled' | 'paused';

  // Authorize.net references
  authorizeNetSubscriptionId: string | null;
  authorizeNetCustomerProfileId: string | null;

  // Promo tracking
  promoCode: string | null;
  promoMonthsRemaining: number; // Countdown for EARLYBIRD50
  promoType?: 'free_months' | 'percent_off'; // Type of promo

  // Add-ons
  addons: string[]; // Array of addon IDs: ['ezal', 'bigWorm', 'customIntegrations']

  // Billing cycle
  billingCycleStart: Timestamp;
  currentPeriodEnd: Timestamp;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  socialEquityVerified: boolean;
  socialEquityPromoCode?: string; // Unique promo code generated on SE approval
}

/**
 * USAGE RECORDS COLLECTION
 *
 * Tracks usage per billing period.
 * One doc per subscription per month, keyed by subscriptionId-period.
 */
export interface UsageRecord {
  id: string;
  subscriptionId: string;
  period: string; // ISO format: '2026-02'

  // Usage counters
  smsCustomerUsed: number;
  smsInternalUsed: number;
  emailsUsed: number;
  aiSessionsUsed: number;
  creativeAssetsUsed: number;
  competitorsTracked: number;
  zipCodesActive: number;

  // Overage charges
  overageCharges: {
    sms: number; // $ amount
    email: number;
    creativeAssets: number;
    zipCodes: number;
    competitors: number;
    total: number;
  };

  // Alert tracking
  alertSentAt80Percent: boolean;

  // Metadata
  updatedAt: Timestamp;
}

/**
 * STAFF_PHONES COLLECTION
 *
 * Internal phone numbers for SMS alerts (Ezal competitive alerts, etc).
 * Scoped to subscription + location (for multi-location MSOs).
 */
export interface StaffPhoneNumber {
  id: string;
  subscriptionId: string;
  locationId: string; // Which location — for multi-location alert routing

  // Basic info
  name: string;
  phone: string; // E.164 format: +1-555-0123
  role: 'owner' | 'manager' | 'budtender' | 'marketing';

  // SMS alert preferences
  alertPreferences: {
    competitorPriceDrops: boolean;
    newCompetitorProducts: boolean;
    competitorMenuShakeup: boolean;
    allLocations?: boolean; // Owner flag: get alerts from all locations
  };

  // Consent & compliance
  smsConsentTimestamp: Timestamp; // TCPA compliance
  active: boolean;

  // Metadata
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * PLAYBOOK_ASSIGNMENTS COLLECTION
 *
 * Tracks which playbooks are active for each subscription.
 * One doc per playbook per subscription.
 */
export interface PlaybookAssignment {
  id: string;
  subscriptionId: string;
  playbookId: string;

  // Status
  status: 'active' | 'paused' | 'completed';

  // Execution tracking
  lastTriggered: Timestamp | null;
  triggerCount: number;

  // Metadata
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * PROMO_REDEMPTIONS COLLECTION
 *
 * Audit trail of promo code redemptions.
 * One doc per redemption event.
 */
export interface PromoRedemption {
  id: string;
  code: string;
  customerId: string;
  subscriptionId: string;
  tierId: string;

  // Promo details
  promoType: 'free_months' | 'percent_off';
  value: number; // 3 for EARLYBIRD50, 50 for SOCIALEQUITY

  // Timing
  appliedAt: Timestamp;
  expiresAt?: Timestamp | null; // null if no expiry
  monthsRemaining?: number; // For free_months type

  // Metadata
  createdAt: Timestamp;
}

/**
 * SE_APPLICATIONS COLLECTION
 *
 * Social Equity program applications.
 * One doc per SE application (may be pending, approved, or rejected).
 */
export interface SEApplication {
  id: string;
  dispensaryName: string;
  licenseNumber: string;
  licenseType: 'social_equity' | 'equity_applicant';
  state: string;
  licenseImageUrl: string; // Firebase Storage path

  // Application status
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string | null; // BakedBot team member email
  reviewedAt?: Timestamp | null;

  // Approval outcome
  promoCode?: string | null; // Unique SOCIALEQUITY-{id} code generated on approval
  rejectionReason?: string; // If rejected

  // Metadata
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * LEADS COLLECTION
 *
 * Sales leads from Empire tier intake form.
 * Tracks prospective Empire customers through sales pipeline.
 */
export interface Lead {
  id: string;

  // Contact info
  contactName: string;
  contactEmail: string;
  dispensaryName: string;

  // Business context
  locationCount: number;
  currentTechStack: string[]; // e.g., ['Cova POS', 'Dutchie ecommerce']
  painPoints: string[]; // e.g., ['competitor tracking', 'compliance']

  // Calendar scheduling
  calendlyScheduledAt?: Timestamp | null;

  // Pricing
  calculatedPrice: number; // locationCount × $999

  // Pipeline
  status: 'new' | 'contacted' | 'qualified' | 'closed_won' | 'closed_lost';
  assignedTo?: string | null; // BakedBot team member email
  notes: string[];

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * USAGE_SIGNALS COLLECTION
 *
 * Behavioral signals for proactive upgrade nudges.
 * Tracks user actions that indicate readiness to upgrade.
 */
export interface UpgradeSignal {
  id: string;
  subscriptionId: string;

  // Signal details
  signalType:
    | 'feature_ceiling_hit'
    | 'upgrade_nudge_viewed'
    | 'competitive_snapshot_viewed'
    | 'behavioral_signal'
    | 'manual_sales_call';
  signalDetail: string; // e.g., 'hit_25_msg_limit', 'viewed_locked_pricing_3x'

  // Scoring
  score: number; // 1-10, accumulates per tier
  totalScoreThisMonth: number; // Reset monthly

  // Metadata
  triggeredAt: Timestamp;
  expiresAt: Timestamp; // 30 days from triggered
}

/**
 * TYPE EXPORTS FOR DOWNSTREAM USE
 */
export type TierId = 'scout' | 'pro' | 'growth' | 'empire';
export type SubscriptionStatus = Subscription['status'];
export type PlaybookStatus = PlaybookAssignment['status'];
