# Comprehensive Testing Guide (Mega Guide)

**Goal**: Verify ALL core features of the platform, across all roles.

## 1. Setup & Roles

### Roles
- **Customer**: Standard shopper.
- **Budtender**: Dispensary employee (Free Tool).
- **Brand/Dispensary Owner**: Paid admin user.
- **Super Admin (CEO)**: Martez/You.

### Prerequisites
- Local Server: `npm run dev`.
- **Online Tool for Embeds**: Use [CodePen](https://codepen.io/pen/) or [JSFiddle](https://jsfiddle.net/).

---

## 2. Customer Shopping Loop (End-to-End)

1. **Login** as Customer.
2. **Shop**: Add items to cart at a dispensary.
3. **Checkout**: Select "Pickup".
4. **QR Code**: Verify code appears on Confirmation page.
5. **Dashboard**: Check `Order History` and `Favorites`.

---

## 3. Budtender Tools (The "Backdoor")

1. **Login** as Budtender.
2. **Dashboard**: Verify "Smokey" (AI Co-Pilot) is present.
3. **Voice Test**: Ask Smokey a product question.
4. **Scan Flow**:
   - Go to `/scan/{orderId}` (from Customer step).
   - View Order -> Mark Ready/Complete.
   - **Claim Hook**: If dispensary is unclaimed, verify "Claim Your Page" banner appears.
   - Click banner -> Verify redirect to `/claim`.

---

## 4. Brand & Dispensary Admin Features

**Login as Brand or Dispensary Owner** for these steps.

### A. Team Invites
1. Go to `/dashboard/settings`.
2. Click **Team** tab.
3. **Action**: Send an invite to a test email.
4. **Verify**: Invite appears in list as "Pending".

### B. Headless Menu (Embed)
1. Go to `/dashboard/settings`.
2. Click **Embeds** tab.
3. **Action**: Customize settings (Theme/Color) and click "Generate Code".
4. **Test**:
   - Copy the generated script.
   - Open **[CodePen](https://codepen.io/pen/)**.
   - Paste code into the HTML section.
   - **Verify**: The menu loads inside the iframe/preview window.

### C. WordPress Plugin
1. Go to `/dashboard/settings`.
2. Click **WordPress Plugin** tab.
3. **Action**: Verify download link/instructions are present.
4. **Test**: *Contact Martez for validation on Siteground.*

---

## 5. Super Admin (CEO) Features

**Login as Super Admin** (`martez@bakedbot.ai` or equivalent).

### A. Talk Tracks (Playbooks)
1. Go to `/dashboard/ceo` (or check tabs).
2. Click **Talk Tracks** tab.
3. **Action**: Create a new Track (e.g., "Upsell 101").
4. **Trigger**: Set keyword trigger (e.g., "upsell").
5. **Verify**: Go to Chat, type the keyword, and verify the model follows the track.

### B. Agentic Chat & Squad
1. Go to `/dashboard/ceo?tab=agents` (or **Boardroom** tab).
2. **Test Squad**:
   - Ask a financial question ("What is our MRR?"). **Verify**: Money Mike responds.
   - Ask a compliance question ("Is this compliant?"). **Verify**: Deebo responds.
   - Ask a marketing question. **Verify**: Craig responds.

### C. Super Admin Invites
1. Go to `/dashboard/ceo?tab=invites`.
2. **Verify**: You can invite new *Super Admins* (distinct from Team Invites).

---

## 6. Public SEO Pages

**Goal**: Verify public-facing pages load correctly (SSR/Hydration).

1. **Dispensary Page**:
   - URL: `/dispensaries/[state]/[city]/[slug]` (Find a real one from database).
   - **Test**: Page loads, Menu visible, "Claim This Dispensary" button visible (if unclaimed).

2. **Brand Page**:
   - URL: `/brands/[slug]` (or similar structure).
   - **Test**: Brand story, products list load correctly.

---

## 7. Regression Checks

- **Brand Role**: Login as Brand. Ensure redirect to `/dashboard` works and "Marketing Agent" (Craig) is accessible.
- **Mobile Check**: Resize browser to mobile width. Verify Menus and Chat are usable.
