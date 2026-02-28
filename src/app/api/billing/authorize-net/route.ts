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
  let db: FirebaseFirestore.Firestore;
  let body: SubscribeBody | null = null;

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

    const apiLoginId = process.env.AUTHNET_API_LOGIN_ID;
    const transactionKey = process.env.AUTHNET_TRANSACTION_KEY;

    if (!apiLoginId || !transactionKey) {
      logger.error("Authorize.Net env vars missing");
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
      return NextResponse.json({ error: "Failed to create customer profile with Authorize.Net" }, { status: 502 });
    }

    const customerProfileId = profileJson.customerProfileId;
    const customerPaymentProfileId = profileJson.customerPaymentProfileIdList?.[0] ?? profileJson.customerPaymentProfileIdList?.customerPaymentProfileId;

    if (!customerProfileId || !customerPaymentProfileId) {
      logger.error("Missing profile IDs from Authorize.Net", profileJson);
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
      return NextResponse.json({ error: "Failed to create subscription with Authorize.Net" }, { status: 502 });
    }

    const providerSubscriptionId = subJson.subscriptionId;
    const subDoc = {
      planId, locationCount: body.locationCount, packIds: body.coveragePackIds || [], amount, provider: "authorizenet",
      providerSubscriptionId, customerProfileId, customerPaymentProfileId, status: "active",
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    };

    await subscriptionRef.set(subDoc, { merge: true });
    await historyRef.set({ ...subDoc, event: "plan_changed", reason: "user_subscribed", at: FieldValue.serverTimestamp() });

    await emitEvent({ orgId, type: 'subscription.paymentAuthorized', agent: 'money_mike', refId: subscriptionRef.id, data: { planId, amount, providerSubscriptionId } });
    await emitEvent({ orgId, type: 'subscription.updated', agent: 'money_mike', refId: subscriptionRef.id, data: subDoc });

    return NextResponse.json({ success: true, free: false, planId, amount, providerSubscriptionId, customerProfileId, customerPaymentProfileId });
  } catch (err: any) {
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
