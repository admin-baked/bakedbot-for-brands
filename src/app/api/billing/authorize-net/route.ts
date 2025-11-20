
import { NextRequest, NextResponse } from "next/server";
import { computeMonthlyAmount, PLANS, PlanId } from "@/lib/plans";

type OpaqueData = {
  dataDescriptor: string;
  dataValue: string;
};

interface SubscribeBody {
  organizationId: string;
  planId: PlanId;
  locationCount: number;
  opaqueData?: OpaqueData;
  customer?: {
    fullName?: string;
    email?: string;
    company?: string;
    zip?: string;
  };
}

function getAuthNetBaseUrl() {
  const env = (process.env.AUTHNET_ENV || "sandbox").toLowerCase();
  return env === "production"
    ? "https://api2.authorize.net/xml/v1/request.api"
    : "https://apitest.authorize.net/xml/v1/request.api";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubscribeBody;

    if (!body.organizationId || !body.planId || typeof body.locationCount !== "number") {
      return NextResponse.json(
        { error: "Missing organizationId, planId, or locationCount." },
        { status: 400 }
      );
    }

    // Enterprise is not self-serve
    if (body.planId === "enterprise") {
      return NextResponse.json(
        { error: "Enterprise billing is handled via a custom agreement." },
        { status: 400 }
      );
    }

    const plan = PLANS[body.planId];
    if (!plan) {
      return NextResponse.json({ error: "Unknown planId." }, { status: 400 });
    }

    const apiLoginId = process.env.AUTHNET_API_LOGIN_ID;
    const transactionKey = process.env.AUTHNET_TRANSACTION_KEY;

    if (!apiLoginId || !transactionKey) {
      console.error("Authorize.Net env vars missing");
      return NextResponse.json(
        { error: "Authorize.Net is not configured on the server." },
        { status: 500 }
      );
    }

    // Compute monthly amount based on plan + locations
    const amount = computeMonthlyAmount(body.planId, body.locationCount);

    // Free plan: no Authorize.Net call, just mark subscription internally
    if (amount === 0) {
      // TODO: Save free subscription in Firestore for organizationId
      // e.g. create `subscriptions` doc with planId = "free" and status "active"
      return NextResponse.json({
        success: true,
        planId: body.planId,
        amount,
        subscriptionId: null,
        providerSubscriptionId: null,
        free: true,
      });
    }

    if (!body.opaqueData) {
      return NextResponse.json(
        { error: "Paid plans require payment token (opaqueData) from Accept.js." },
        { status: 400 }
      );
    }

    const baseUrl = getAuthNetBaseUrl();

    // Step 1: Create Customer Profile with payment profile
    const customerProfilePayload = {
      createCustomerProfileRequest: {
        merchantAuthentication: {
          name: apiLoginId,
          transactionKey,
        },
        profile: {
          merchantCustomerId: body.organizationId,
          description: `Org ${body.organizationId} – BakedBot subscription`,
          email: body.customer?.email,
          paymentProfiles: [
            {
              billTo: {
                firstName: body.customer?.fullName,
                company: body.customer?.company,
                zip: body.customer?.zip,
              },
              payment: {
                opaqueData: {
                  dataDescriptor: body.opaqueData.dataDescriptor,
                  dataValue: body.opaqueData.dataValue,
                },
              },
            },
          ],
        },
        validationMode:
          (process.env.AUTHNET_ENV || "sandbox").toLowerCase() === "production"
            ? "liveMode"
            : "testMode",
      },
    };

    const profileResp = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customerProfilePayload),
    });

    const profileJson: any = await profileResp.json().catch(() => null);
    if (profileJson?.messages?.resultCode !== "Ok") {
      console.error("Authorize.Net profile creation failed", profileJson);
      return NextResponse.json(
        { error: "Failed to create customer profile with Authorize.Net" },
        { status: 502 }
      );
    }

    const customerProfileId = profileJson.customerProfileId;
    const customerPaymentProfileId =
      profileJson.customerPaymentProfileIdList?.[0] ??
      profileJson.customerPaymentProfileIdList?.customerPaymentProfileId;

    if (!customerProfileId || !customerPaymentProfileId) {
      console.error("Missing profile IDs from Authorize.Net", profileJson);
      return NextResponse.json(
        { error: "Payment profile missing from Authorize.Net response" },
        { status: 502 }
      );
    }

    // Step 2: ARB (subscription) creation
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const startDateStr = startDate.toISOString().slice(0, 10); // YYYY-MM-DD

    const subscriptionName = `BakedBot – ${plan.name} – Org ${body.organizationId}`;

    const createSubPayload = {
      ARBCreateSubscriptionRequest: {
        merchantAuthentication: {
          name: apiLoginId,
          transactionKey,
        },
        subscription: {
          name: subscriptionName,
          paymentSchedule: {
            interval: {
              length: 1,
              unit: "months",
            },
            startDate: startDateStr,
            totalOccurrences: 9999,
          },
          amount,
          trialAmount: 0,
          profile: {
            customerProfileId,
            customerPaymentProfileId,
          },
          customer: {
            id: body.organizationId,
            email: body.customer?.email,
          },
        },
      },
    };

    const subResp = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createSubPayload),
    });

    const subJson: any = await subResp.json().catch(() => null);

    if (subJson?.messages?.resultCode !== "Ok") {
      console.error("Authorize.Net subscription creation failed", subJson);
      return NextResponse.json(
        { error: "Failed to create subscription with Authorize.Net" },
        { status: 502 }
      );
    }

    const providerSubscriptionId = subJson.subscriptionId;

    // TODO: Persist subscription in Firestore for this org:
    //  - planId
    //  - amount
    //  - locationCount
    //  - provider = "authorizenet"
    //  - providerSubscriptionId
    //  - customerProfileId / customerPaymentProfileId
    //  - status = "active"

    return NextResponse.json({
      success: true,
      planId: body.planId,
      amount,
      providerSubscriptionId,
      customerProfileId,
      customerPaymentProfileId,
      free: false,
    });
  } catch (err: any) {
    console.error("authorize-net:subscription_error", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error creating subscription" },
      { status: 500 }
    );
  }
}
