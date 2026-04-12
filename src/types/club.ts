export type Member = {
  id: string;
  organizationId: string;
  defaultStoreId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  status: "active" | "inactive" | "blocked";
  verificationStatus: "unverified" | "partially_verified" | "verified";
  communicationConsent: {
    sms: boolean;
    email: boolean;
    push: boolean;
    updatedAt: string;
  };
  preferences?: {
    favoriteCategories?: string[];
    favoriteBrands?: string[];
    notes?: string[];
  };
  createdAt: string;
  updatedAt: string;
};

export type Membership = {
  id: string;
  memberId: string;
  organizationId: string;
  storeId?: string;
  tierId?: string;
  status: "active" | "paused" | "expired" | "revoked";
  joinedAt: string;
  lastCheckInAt?: string;
  lastTransactionAt?: string;
  referralCode?: string;
  stats: {
    lifetimePointsEarned: number;
    lifetimePointsRedeemed: number;
    visitCount: number;
    transactionCount: number;
    lifetimeSpendCents: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type Pass = {
  id: string;
  memberId: string;
  membershipId: string;
  organizationId: string;
  storeId?: string;
  displayName: string;
  memberCode: string;
  qrValue: string;
  barcodeValue: string;
  barcodeType: "code128";
  status: "active" | "rotating" | "suspended" | "revoked";
  walletEligible: boolean;
  issuedAt: string;
  lastViewedAt?: string;
  lastScannedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type VisitSession = {
  id: string;
  organizationId: string;
  storeId: string;
  memberId: string;
  membershipId: string;
  passId?: string;
  source: "customer_app" | "tablet" | "staff_scan" | "pos_lookup";
  status:
    | "opened"
    | "recognized"
    | "attached_to_cart"
    | "transacting"
    | "completed"
    | "abandoned"
    | "failed";
  openedAt: string;
  recognizedAt?: string;
  attachedToCartAt?: string;
  completedAt?: string;
  abandonedAt?: string;
  deviceId?: string;
  staffUserId?: string;
  posCartRef?: string;
  posTransactionRef?: string;
  notes?: string[];
  // Tablet check-in enrichment
  cartItems?: Array<{ productId: string; name: string; price: number; category?: string }>;
  customerMood?: string;
  customerName?: string;
  visitCheckinId?: string;   // links back to checkin_visits doc
  createdAt: string;
  updatedAt: string;
};

export type CheckIn = {
  id: string;
  organizationId: string;
  storeId: string;
  memberId: string;
  membershipId: string;
  visitSessionId: string;
  source: "customer_app" | "tablet" | "staff_scan";
  status: "started" | "completed" | "failed";
  method: "qr" | "barcode" | "phone_lookup" | "email_lookup" | "manual";
  deviceId?: string;
  failureReason?: string;
  checkedInAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Reward = {
  id: string;
  organizationId: string;
  storeId?: string;
  memberId: string;
  membershipId: string;
  rewardType:
    | "discount_percent"
    | "discount_amount"
    | "free_item"
    | "tier_perk"
    | "birthday_reward"
    | "welcome_reward";
  title: string;
  description?: string;
  status:
    | "locked"
    | "available"
    | "reserved"
    | "redeemed"
    | "expired"
    | "blocked";
  value?: {
    percentOff?: number;
    amountOffCents?: number;
    skuIds?: string[];
  };
  issuedAt?: string;
  availableAt?: string;
  expiresAt?: string;
  reservedAt?: string;
  redeemedAt?: string;
  redemptionContext?: {
    visitSessionId?: string;
    transactionId?: string;
    staffUserId?: string;
  };
  policy?: {
    approvalRequired: boolean;
    stackable: boolean;
    storeRestricted: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type Offer = {
  id: string;
  organizationId: string;
  storeId?: string;
  title: string;
  description?: string;
  channel: "in_app" | "tablet" | "staff_prompt" | "sms" | "email";
  status: "draft" | "active" | "paused" | "expired" | "blocked";
  audienceRules?: Record<string, unknown>;
  triggerRules?: Record<string, unknown>;
  redemptionRules?: Record<string, unknown>;
  createdBy: "staff" | "agent" | "system";
  createdAt: string;
  updatedAt: string;
};

export type PointsLedgerEntry = {
  id: string;
  organizationId: string;
  memberId: string;
  membershipId: string;
  visitSessionId?: string;
  transactionId?: string;
  type: "earned" | "redeemed" | "expired" | "adjusted";
  points: number;
  reason:
    | "purchase"
    | "welcome_bonus"
    | "birthday_bonus"
    | "reward_redemption"
    | "manual_adjustment"
    | "expiration";
  balanceAfter: number;
  createdAt: string;
};

export type Transaction = {
  id: string;
  organizationId: string;
  storeId: string;
  memberId?: string;
  membershipId?: string;
  visitSessionId?: string;
  externalTransactionId: string;
  externalCartId?: string;
  status: "started" | "completed" | "voided";
  subtotalCents: number;
  discountCents: number;
  taxCents?: number;
  totalCents: number;
  items: Array<{
    skuId: string;
    externalSkuId?: string;
    name: string;
    category?: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  discounts?: Array<{
    code?: string;
    rewardId?: string;
    amountCents: number;
    description?: string;
  }>;
  staffUserId?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffUser = {
  id: string;
  organizationId: string;
  storeId?: string;
  fullName: string;
  email: string;
  role: "budtender" | "manager" | "admin" | "compliance" | "marketing";
  status: "active" | "inactive";
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type Recommendation = {
  id: string;
  organizationId: string;
  storeId: string;
  memberId: string;
  visitSessionId?: string;
  type: "product" | "reward_prompt" | "upsell" | "cross_sell" | "winback";
  audience: "staff" | "member";
  title: string;
  body?: string;
  status: "active" | "viewed" | "dismissed" | "accepted" | "expired";
  source: "smokey" | "mrs_parker" | "craig" | "system";
  evidence?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  organizationId: string;
  storeId?: string;
  memberId?: string;
  visitSessionId?: string;
  type:
    | "staff_followup"
    | "manager_approval"
    | "reward_review"
    | "pos_reconciliation"
    | "campaign_review";
  title: string;
  description?: string;
  state:
    | "detected"
    | "ready"
    | "awaiting_staff"
    | "awaiting_manager"
    | "executed"
    | "blocked"
    | "completed"
    | "expired";
  assignedToStaffUserId?: string;
  dueAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type EventType =
  | "member_enrollment_started"
  | "member_enrollment_completed"
  | "pass_issued"
  | "pass_viewed"
  | "pass_scanned"
  | "pass_lookup_failed"
  | "checkin_started"
  | "checkin_completed"
  | "checkin_failed"
  | "visit_opened"
  | "visit_attached_to_cart"
  | "visit_completed"
  | "visit_abandoned"
  | "reward_unlocked"
  | "reward_redeemed"
  | "reward_expired"
  | "cart_started"
  | "transaction_completed"
  | "transaction_voided"
  | "recommendation_generated"
  | "recommendation_presented"
  | "offer_blocked_by_policy"
  | "pos_sync_failed";

export type ClubEvent = {
  id: string;
  type: EventType;
  occurredAt: string;
  organizationId: string;
  storeId?: string;
  actor: {
    type: "member" | "staff" | "system";
    id: string;
  };
  subject: {
    type: "visit_session" | "member" | "transaction" | "reward" | "pass";
    id: string;
  };
  source: {
    surface: "customer_app" | "tablet" | "staff_app" | "pos" | "system" | "staff_scan" | "pos_lookup";
    deviceId?: string;
  };
  payload?: Record<string, unknown>;
};

export type TriggerDefinition = {
  id: string;
  eventType: EventType;
  conditions?: Record<string, unknown>;
  action:
    | "create_visit_session"
    | "enqueue_staff_queue"
    | "show_reward"
    | "attach_member_context"
    | "award_points"
    | "unlock_reward"
    | "create_task"
    | "draft_offer"
    | "block_action";
  requiresApproval: boolean;
};

export type StaffPrimitive =
  | "recognize_member"
  | "lookup_member"
  | "attach_member_to_cart"
  | "view_available_rewards"
  | "redeem_reward"
  | "view_recommendations"
  | "start_budtender_session"
  | "complete_handoff"
  | "escalate_to_manager"
  | "resolve_visit_session";
