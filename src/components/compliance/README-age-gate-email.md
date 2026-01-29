# Age Gate with Email Capture

This component turns compliance friction into funnel growth by capturing email/phone leads during age verification.

## Features

- ✅ State-aware age verification (18+ medical, 21+ recreational)
- ✅ Optional email + phone capture
- ✅ TCPA/CAN-SPAM compliant consent checkboxes
- ✅ Stores leads in Firestore
- ✅ Triggers Craig welcome email/SMS workflows
- ✅ Beautiful UI with value prop messaging
- ✅ 24-hour localStorage caching

## Usage

### Basic Integration (Menu Pages)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { AgeGateWithEmail, isAgeVerified } from '@/components/compliance/age-gate-with-email';

export function MenuPage({ brandId }: { brandId: string }) {
    const [showAgeGate, setShowAgeGate] = useState(false);

    useEffect(() => {
        // Check if user is already verified
        if (!isAgeVerified()) {
            setShowAgeGate(true);
        }
    }, []);

    const handleVerified = () => {
        setShowAgeGate(false);
    };

    return (
        <div>
            {showAgeGate && (
                <AgeGateWithEmail
                    onVerified={handleVerified}
                    brandId={brandId}
                    state="IL" // or detect from IP/location
                    source="menu"
                />
            )}

            {/* Your menu content */}
            <div className="menu-content">
                {/* Menu items, products, etc. */}
            </div>
        </div>
    );
}
```

### Demo Shop Integration

```tsx
// app/demo-shop/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { AgeGateWithEmail, isAgeVerified } from '@/components/compliance/age-gate-with-email';

export default function DemoShopPage() {
    const [showAgeGate, setShowAgeGate] = useState(false);

    useEffect(() => {
        if (!isAgeVerified()) {
            setShowAgeGate(true);
        }
    }, []);

    return (
        <div>
            {showAgeGate && (
                <AgeGateWithEmail
                    onVerified={() => setShowAgeGate(false)}
                    brandId="demo-brand"
                    source="demo-shop"
                    state="IL"
                />
            )}

            <main className="container mx-auto px-4 py-8">
                <h1>Demo Cannabis Shop</h1>
                {/* Shop content */}
            </main>
        </div>
    );
}
```

### Dispensary Integration

```tsx
import { AgeGateWithEmail } from '@/components/compliance/age-gate-with-email';

export function DispensaryMenu({ dispensaryId, state }: { dispensaryId: string; state: string }) {
    const [showAgeGate, setShowAgeGate] = useState(!isAgeVerified());

    return (
        <div>
            {showAgeGate && (
                <AgeGateWithEmail
                    onVerified={() => setShowAgeGate(false)}
                    dispensaryId={dispensaryId}
                    state={state}
                    source="dispensary-menu"
                />
            )}

            {/* Dispensary menu */}
        </div>
    );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onVerified` | `() => void` | ✅ | Callback when age is verified |
| `state` | `string` | ⚠️ | Two-letter state code (e.g., "IL", "CA"). Required for state-specific age requirements. |
| `brandId` | `string` | ❌ | Brand identifier for tracking |
| `dispensaryId` | `string` | ❌ | Dispensary identifier for tracking |
| `source` | `string` | ❌ | Source identifier ("menu", "demo-shop", "homepage"). Default: "website" |
| `minimumAge` | `number` | ❌ | Override minimum age (bypasses state detection) |

## Email Lead Data Structure

Captured leads are stored in Firestore at `/email_leads/{leadId}`:

```typescript
interface EmailLead {
    id: string;
    email?: string;
    phone?: string;
    firstName?: string;
    emailConsent: boolean;
    smsConsent: boolean;
    brandId?: string;
    dispensaryId?: string;
    state?: string;
    source: string;
    ageVerified: boolean;
    dateOfBirth?: string; // ISO date string
    capturedAt: number; // Unix timestamp
    lastUpdated: number;
    welcomeEmailSent?: boolean;
    welcomeSmsSent?: boolean;
    tags: string[]; // e.g., ["menu", "age-verified", "email-opt-in"]
}
```

## Welcome Email/SMS Workflow

When a user provides email/phone with consent:

1. Lead is captured in Firestore
2. Job is queued for Craig (marketer agent)
3. Craig sends personalized welcome message via:
   - **Email**: Mailjet API
   - **SMS**: Blackleaf API
4. Lead is tagged with `welcomeEmailSent` or `welcomeSmsSent`

## Lead Analytics

### Get All Leads for a Brand

```typescript
import { getLeads } from '@/server/actions/email-capture';

const leads = await getLeads('brand-123');
```

### Get Lead Statistics

```typescript
import { getLeadStats } from '@/server/actions/email-capture';

const stats = await getLeadStats('brand-123');
// Returns:
// {
//   total: 150,
//   emailOptIns: 120,
//   smsOptIns: 80,
//   ageVerified: 150,
//   bySource: {
//     menu: 100,
//     "demo-shop": 30,
//     homepage: 20
//   }
// }
```

## Compliance Notes

### TCPA (SMS)
- ✅ Explicit checkbox consent required before sending SMS
- ✅ "Message & data rates may apply" disclosure
- ✅ "Reply STOP to opt out" disclosure
- ✅ Consent timestamp stored in Firestore

### CAN-SPAM (Email)
- ✅ Explicit checkbox consent required before sending marketing emails
- ✅ "You can unsubscribe anytime" disclosure
- ✅ Consent timestamp stored in Firestore
- ⚠️ Ensure welcome emails include unsubscribe link (Craig handles this)

## Firestore Security Rules

The `/email_leads` collection is **server-side write only**:

```javascript
match /email_leads/{leadId} {
  // Server-side only creation (prevents spam).
  allow create, update: if false;

  // Brand managers can read their own leads.
  allow read: if isRole('brand') &&
                 (request.auth.token.brandId == resource.data.brandId);

  // Dispensary managers can read their own leads.
  allow read: if isRole('dispensary') &&
                 (request.auth.token.locationId == resource.data.dispensaryId);

  // Owner can read all leads.
  allow read: if isRole('owner');

  // No client-side deletes.
  allow delete: if false;
}
```

## State Detection

The component uses Deebo (compliance agent) for state-specific age requirements:

- **Recreational states**: 21+
- **Medical states**: 18+ (with medical card)
- **Blocked states**: Shows "not available" message

To detect state from IP/location, use a geolocation service or ask the user.

## LocalStorage Caching

Age verification is cached in `localStorage` for 24 hours:

```typescript
{
  verified: true,
  dateOfBirth: "1990-01-15",
  state: "IL",
  timestamp: 1706400000000,
  expiresAt: 1706486400000
}
```

Use `isAgeVerified()` helper to check if user is already verified.

## Example: Replace Existing Age Gate

If you have an existing age gate, simply replace it:

```diff
- import { AgeGate } from '@/components/compliance/age-gate';
+ import { AgeGateWithEmail } from '@/components/compliance/age-gate-with-email';

  {showAgeGate && (
-   <AgeGate onVerified={handleVerified} state="IL" />
+   <AgeGateWithEmail
+     onVerified={handleVerified}
+     state="IL"
+     brandId="your-brand-id"
+     source="menu"
+   />
  )}
```

## Dashboard Integration

Brand managers can view captured leads in the CEO Dashboard:

```
/dashboard/ceo?tab=leads
```

Shows:
- Total leads captured
- Email/SMS opt-in rates
- Breakdown by source (menu, demo-shop, homepage)
- Export to CSV
- Send bulk campaigns via Craig

## Benefits

1. **Turn compliance into growth**: Every age verification becomes a lead capture opportunity
2. **First-party data**: Build owned audience, reduce reliance on paid ads
3. **Automated nurture**: Craig handles welcome emails/SMS automatically
4. **Privacy compliant**: Explicit consent + clear disclosures
5. **Competitive differentiator**: Most age gates don't capture leads
6. **Low-cost funnel feeder**: Give to dispensaries/brands cheaply to feed your marketing funnel

## Support

Questions? Check:
- `src/components/compliance/age-gate-with-email.tsx` - Component implementation
- `src/server/actions/email-capture.ts` - Server actions
- `firestore.rules` - Security rules
