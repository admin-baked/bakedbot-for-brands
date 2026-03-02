import { NextRequest, NextResponse } from "next/server";
import { computeMonthlyAmount, PLANS, PlanId, CoveragePackId } from "@/lib/plans";
import { createServerClient } from "@/firebase/server-client";
import { FieldValue } from "firebase-admin/firestore";
import { emitEvent } from "@/server/events/emitter";
import { requireUser } from "@/server/auth/auth";
import { z } from 'zod';

import { logger } from '@/lib/logger';
import { isCompanyPlanCheckoutEnabled } from '@/lib/feature-flags';

const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due']);
const CHECKOUT_LOCK_WINDOW_MS = 10 * 60 * 1000;

const subscribeBodySchema = z.object({
  organizationId: z.string().trim().min(1),
  planId: z.string().trim().min(1),
  locationCount: z.number().int().min(1).max(500),
  coveragePackIds: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  opaqueData: z.object({
    dataDescriptor: z.string().trim().min(1).max(120),
    dataValue: z.string().trim().min(1),
  }).optional(),
  customer: z.object({
    fullName: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().optional(),
    company: z.string().trim().max(160).optional(),
    zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/).optional(),
  }).optional(),
});

/**
 * Verify that a user has access to an organization (owner or admin)
 */
async function verifyOrgAccess(uid: string, orgId: string, firestore: FirebaseFirestore.Firestore): Promise<boolean> {
  // Check organization ownership
  const orgDoc = await firestore.collection('organizations').doc(orgId).get();
  if (!orgDoc.exists) {
    return false;
  }

  const orgData = orgDoc.data();
  if (orgData?.ownerId === uid || orgData?.ownerUid === uid) {
    return true;
  }

  // Check membership with admin role
  const memberDoc = await firestore
    .collection('organizations')
    .doc(orgId)
    .collection('members')
    .doc(uid)
    .get();

  if (memberDoc.exists) {
    const memberData = memberDoc.data();
    // Only allow owners/admins to modify billing
    if (memberData?.role === 'owner' || memberData?.role === 'admin' || memberData?.role === 'brand_admin') {
      return true;
    }
  }

  return false;
}

type OpaqueData = {
  dataDescriptor: string;
  dataValue: string;
};

interface SubscribeBody {
  organizationId: string;
  planId: PlanId;
  locationCount: number;
  coveragePackIds?: CoveragePackId[];
  opaqueData?: OpaqueData;
  customer?: {
    fullName?: string;
    email?: string;
    company?: string;
    zip?: string;
  };
}

function isValidDocumentId(value: unknown): value is string {
  return typeof value === 'string' && DOCUMENT_ID_REGEX.test(value);
}

function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'object' && value !== null) {
    const maybeTimestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof maybeTimestamp.toMillis === 'function') {
      const parsed = maybeTimestamp.toMillis();
      return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof maybeTimestamp.seconds === 'number') {
      return Math.round(maybeTimestamp.seconds * 1000);
    }
  }
  return null;
}

async function releaseCheckoutLock(
  db: FirebaseFirestore.Firestore,
  subscriptionRef: FirebaseFirestore.DocumentReference,
  lockToken: string,
) {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(subscriptionRef);
    if (!snap.exists) return;

    const data = snap.data() || {};
    const activeToken = typeof (data as any)?.checkoutLock?.token === 'string'
      ? (data as any).checkoutLock.token
      : '';
    if (activeToken !== lockToken) return;

    tx.set(
      subscriptionRef,
      {
        checkoutLock: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

function getAuthNetBaseUrl() {
  const env = (process.env.AUTHNET_ENV || "sandbox").toLowerCase();
  return env === "production"
    ? "https://api2.authorize.net/xml/v1/request.api"
    : "https://apitest.authorize.net/xml/v1/request.api";
}

/**
 * POST /api/billing/authorize-net
 * Create or update subscription
 *
 * SECURITY: Requires authentication and org admin access.
 */
export async function POST(req: NextRequest) {
  let db!: FirebaseFirestore.Firestore;
  let body: SubscribeBody | null = null;
  let checkoutLockToken: string | null = null;
  let subscriptionRefForLock: FirebaseFirestore.DocumentReference | null = null;

  try {
    if (!isCompanyPlanCheckoutEnabled()) {
      return NextResponse.json(
        { error: "Subscription checkout is currently disabled. Please contact sales." },
        { status: 503 }
      );
    }

    ({ firestore: db } = await createServerClient());

    // SECURITY: Require authenticated session
    let session;
    try {
      session = await requireUser();
    } catch {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    if ((session as any).email_verified === false || (session as any).emailVerified === false) {
      return NextResponse.json(
        { error: 'Email verification is required before starting a paid subscription.' },
        { status: 403 }
      );
    }

    body = subscribeBodySchema.parse(await req.json()) as SubscribeBody;

    if (!isValidDocumentId(body.organizationId)) {
      return NextResponse.json({ error: "Invalid organizationId." }, { status: 400 });
    }

    const orgId = body.organizationId;
    const planId = body.planId;
    const sessionEmail = typeof session.email === 'string' ? session.email.toLowerCase() : '';
    const requestEmail = body.customer?.email?.toLowerCase();
    if (requestEmail && sessionEmail && requestEmail !== sessionEmail) {
      return NextResponse.json(
        { error: "Customer email must match your signed-in account." },
        { status: 403 }
      );
    }

    // SECURITY: Verify user has admin access to the organization
    const hasAccess = await verifyOrgAccess(session.uid, orgId, db);
    if (!hasAccess) {
      logger.warn('[Billing] Unauthorized billing access attempt', {
        uid: session.uid,
        orgId,
        planId,
      });
      return NextResponse.json(
        { error: "Forbidden: You do not have billing access to this organization." },
        { status: 403 }
      );
    }

    await emitEvent({
      orgId,
      type: "subscription.planSelected",
      agent: "money_mike",
      data: { planId, locationCount: body.locationCount },
    });

    if (planId === "enterprise") {
      return NextResponse.json(
        { error: "Enterprise billing is handled via custom agreement." },
        { status: 400 }
      );
    }

    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: "Unknown planId." }, { status: 400 });
    }

    const amount = computeMonthlyAmount(planId, body.locationCount, body.coveragePackIds);

    const subscriptionRef = db
      .collection("organizations")
      .doc(orgId)
      .collection("subscription")
      .doc("current");
    subscriptionRefForLock = subscriptionRef;

    const existingSubscriptionSnap = await subscriptionRef.get();
    if (existingSubscriptionSnap.exists) {
      const existing = existingSubscriptionSnap.data() || {};
      const existingStatus = typeof existing.status === 'string'
        ? existing.status.toLowerCase()
        : '';
      const existingPlanId = typeof existing.planId === 'string' ? existing.planId : '';
      const existingProviderSubId =
        typeof existing.providerSubscriptionId === 'string'
          ? existing.providerSubscriptionId
          : null;
      const existingAmount = Number(existing.amount);

      if (ACTIVE_SUBSCRIPTION_STATUSES.has(existingStatus)) {
        if (existingPlanId === planId && existingProviderSubId) {
          return NextResponse.json({
            success: true,
            reused: true,
            free: false,
            planId,
            amount: Number.isFinite(existingAmount) ? existingAmount : amount,
            providerSubscriptionId: existingProviderSubId,
            customerProfileId:
              typeof existing.customerProfileId === 'string' ? existing.customerProfileId : undefined,
            customerPaymentProfileId:
              typeof existing.customerPaymentProfileId === 'string'
                ? existing.customerPaymentProfileId
                : undefined,
          });
        }

        return NextResponse.json(
          {
            error:
              "An active subscription already exists. Use Billing settings to change or cancel your current plan.",
          },
          { status: 409 },
        );
      }
    }

    const historyRef = db
      .collection("organizations")
      .doc(orgId)
      .collection("subscriptionHistory")
      .doc();

    if (amount === 0) {
      const subDoc = {
        planId,
        locationCount: body.locationCount,
        packIds: body.coveragePackIds || [],
        amount,
        provider: "none",
        providerSubscriptionId: null,
        status: "active",
        checkoutLock: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await subscriptionRef.set(subDoc, { merge: true });
      await historyRef.set({
        ...subDoc,
        event: "plan_changed",
        reason: "user_selected_free_plan",
        at: FieldValue.serverTimestamp(),
      });

      await emitEvent({ orgId, type: 'subscription.updated', agent: 'money_mike', refId: subscriptionRef.id, data: { ...subDoc, reason: "free_plan" } });

      return NextResponse.json({ success: true, free: true, planId, amount });
    }

    if (!body.opaqueData) {
      return NextResponse.json(
        { error: "Paid plans require payment token (opaqueData) from Accept.js." },
        { status: 400 }
      );
    }
    if (!body.customer?.fullName || !body.customer?.email || !body.customer?.zip) {
      return NextResponse.json(
        { error: "Paid plans require customer full name, email, and billing ZIP." },
        { status: 400 }
      );
    }

    const lockStartedAt = new Date().toISOString();
    const lockToken = `${session.uid}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
    let reusedFromLock: Record<string, unknown> | null = null;
    let blockedByActiveSubscription = false;

    try {
      await db.runTransaction(async (tx) => {
        const latestSnap = await tx.get(subscriptionRef);
        const latest = latestSnap.exists ? (latestSnap.data() || {}) : {};
        const latestStatus = typeof latest.status === 'string'
          ? latest.status.toLowerCase()
          : '';
        const latestPlanId = typeof latest.planId === 'string' ? latest.planId : '';
        const latestProviderSubId =
          typeof latest.providerSubscriptionId === 'string'
            ? latest.providerSubscriptionId
            : null;
        const latestAmount = Number(latest.amount);

        if (ACTIVE_SUBSCRIPTION_STATUSES.has(latestStatus)) {
          if (latestPlanId === planId && latestProviderSubId) {
            reusedFromLock = {
              success: true,
              reused: true,
              free: false,
              planId,
              amount: Number.isFinite(latestAmount) ? latestAmount : amount,
              providerSubscriptionId: latestProviderSubId,
              customerProfileId:
                typeof latest.customerProfileId === 'string' ? latest.customerProfileId : undefined,
              customerPaymentProfileId:
                typeof latest.customerPaymentProfileId === 'string'
                  ? latest.customerPaymentProfileId
                  : undefined,
            };
            return;
          }

          blockedByActiveSubscription = true;
          return;
        }

        const existingLockToken = typeof latest.checkoutLock?.token === 'string'
          ? latest.checkoutLock.token
          : '';
        const lockStartedMillis = toMillis(latest.checkoutLock?.startedAt);
        const isFreshLock =
          !!existingLockToken &&
          !!lockStartedMillis &&
          Date.now() - lockStartedMillis < CHECKOUT_LOCK_WINDOW_MS;

        if (isFreshLock) {
          throw new Error('CHECKOUT_ALREADY_IN_PROGRESS');
        }

        tx.set(
          subscriptionRef,
          {
            checkoutLock: {
              token: lockToken,
              startedAt: lockStartedAt,
              userId: session.uid,
              planId,
              amount,
            },
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    } catch (lockErr: any) {
      if (lockErr?.message === 'CHECKOUT_ALREADY_IN_PROGRESS') {
        return NextResponse.json(
          { error: 'A subscription checkout is already in progress for this organization. Please wait and retry.' },
          { status: 409 },
        );
      }
      throw lockErr;
    }

    if (reusedFromLock) {
      return NextResponse.json(reusedFromLock);
    }
    if (blockedByActiveSubscription) {
      return NextResponse.json(
        {
          error:
            "An active subscription already exists. Use Billing settings to change or cancel your current plan.",
        },
        { status: 409 },
      );
    }

    checkoutLockToken = lockToken;

    const apiLoginId = process.env.AUTHNET_API_LOGIN_ID;
    const transactionKey = process.env.AUTHNET_TRANSACTION_KEY;

    if (!apiLoginId || !transactionKey) {
      logger.error("Authorize.Net env vars missing");
      if (checkoutLockToken) {
        await releaseCheckoutLock(db, subscriptionRef, checkoutLockToken);
        checkoutLockToken = null;
      }
      return NextResponse.json(
        { error: "Authorize.Net is not configured on the server." },
        { status: 500 }
      );
    }

    const baseUrl = getAuthNetBaseUrl();
    const customerProfilePayload = {
      createCustomerProfileRequest: {
        merchantAuthentication: { name: apiLoginId, transactionKey },
        profile: {
          merchantCustomerId: orgId,
          description: `Org ${orgId} – BakedBot subscription`,
          email: body.customer?.email,
          paymentProfiles: [{
            billTo: { firstName: body.customer?.fullName, company: body.customer?.company, zip: body.customer?.zip },
            payment: { opaqueData: { dataDescriptor: body.opaqueData.dataDescriptor, dataValue: body.opaqueData.dataValue } },
          }],
        },
        // Prevent random live validation holds; ARB creation remains the source of truth.
        validationMode: "none",
      },
    };

    const profileResp = await fetch(baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(customerProfilePayload) });
    const profileJson: any = await profileResp.json().catch(() => null);

    if (profileJson?.messages?.resultCode !== "Ok") {
      logger.error("Authorize.Net profile creation failed", profileJson);
      await emitEvent({ orgId, type: 'subscription.failed', agent: 'money_mike', data: { stage: "profile_creation", planId, amount, response: profileJson } });
      if (checkoutLockToken) {
        await releaseCheckoutLock(db, subscriptionRef, checkoutLockToken);
        checkoutLockToken = null;
      }
      return NextResponse.json({ error: "Failed to create customer profile with Authorize.Net" }, { status: 502 });
    }

    const customerProfileId = profileJson.customerProfileId;
    const customerPaymentProfileId = profileJson.customerPaymentProfileIdList?.[0] ?? profileJson.customerPaymentProfileIdList?.customerPaymentProfileId;

    if (!customerProfileId || !customerPaymentProfileId) {
      logger.error("Missing profile IDs from Authorize.Net", profileJson);
      if (checkoutLockToken) {
        await releaseCheckoutLock(db, subscriptionRef, checkoutLockToken);
        checkoutLockToken = null;
      }
      return NextResponse.json({ error: "Payment profile missing from Authorize.Net response" }, { status: 502 });
    }

    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const startDateStr = startDate.toISOString().slice(0, 10);
    const subscriptionName = `BakedBot – ${plan.name} – Org ${orgId}`;

    const createSubPayload = {
      ARBCreateSubscriptionRequest: {
        merchantAuthentication: { name: apiLoginId, transactionKey },
        subscription: {
          name: subscriptionName,
          paymentSchedule: { interval: { length: 1, unit: "months" }, startDate: startDateStr, totalOccurrences: 9999 },
          amount,
          trialAmount: 0,
          profile: { customerProfileId, customerPaymentProfileId },
          customer: { id: orgId, email: body.customer?.email },
        },
      },
    };

    const subResp = await fetch(baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createSubPayload) });
    const subJson: any = await subResp.json().catch(() => null);

    if (subJson?.messages?.resultCode !== "Ok") {
      logger.error("Authorize.Net subscription creation failed", subJson);
      await emitEvent({ orgId, type: 'subscription.failed', agent: 'money_mike', data: { stage: "subscription_creation", planId, amount, response: subJson } });
      if (checkoutLockToken) {
        await releaseCheckoutLock(db, subscriptionRef, checkoutLockToken);
        checkoutLockToken = null;
      }
      return NextResponse.json({ error: "Failed to create subscription with Authorize.Net" }, { status: 502 });
    }

    const providerSubscriptionId = subJson.subscriptionId;
    const subDoc = {
      planId, locationCount: body.locationCount, packIds: body.coveragePackIds || [], amount, provider: "authorizenet",
      providerSubscriptionId, customerProfileId, customerPaymentProfileId, status: "active",
      checkoutLock: null,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    };

    await subscriptionRef.set(subDoc, { merge: true });
    checkoutLockToken = null;
    await historyRef.set({ ...subDoc, event: "plan_changed", reason: "user_subscribed", at: FieldValue.serverTimestamp() });

    await emitEvent({ orgId, type: 'subscription.paymentAuthorized', agent: 'money_mike', refId: subscriptionRef.id, data: { planId, amount, providerSubscriptionId } });
    await emitEvent({ orgId, type: 'subscription.updated', agent: 'money_mike', refId: subscriptionRef.id, data: subDoc });

    return NextResponse.json({ success: true, free: false, planId, amount, providerSubscriptionId, customerProfileId, customerPaymentProfileId });
  } catch (err: any) {
    if (checkoutLockToken && subscriptionRefForLock) {
      try {
        await releaseCheckoutLock(db, subscriptionRefForLock, checkoutLockToken);
      } catch (releaseErr) {
        logger.warn('authorize-net:checkout_lock_release_failed', {
          error: releaseErr instanceof Error ? releaseErr.message : String(releaseErr),
          orgId: body?.organizationId,
        });
      } finally {
        checkoutLockToken = null;
      }
    }

    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || 'Invalid request payload' }, { status: 400 });
    }
    logger.error("authorize-net:subscription_error", err);
    if (body?.organizationId) {
      await emitEvent({ orgId: body.organizationId, type: 'subscription.failed', agent: 'money_mike', data: { error: err?.message || String(err), planId: body.planId } });
    }
    return NextResponse.json({ error: err?.message || "Unexpected error creating subscription" }, { status: 500 });
  }
}
