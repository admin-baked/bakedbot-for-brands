# Grower Owner QA Loop: One Week Simulation (B2B Wholesale Cultivator)

**Purpose**: This document provides a loop-based testing curriculum for AI Agents simulating a **Grower/Cultivator** (`grower` role, B2B wholesale e-commerce).

**Goal**: Execute continuously to clear bugs specific to the B2B wholesale catalog, B2B distribution orders, and intelligence features tailored for cultivators.

---

## 📅 Day 1: Operation Foundation & Team
**Objective**: Verify the initial setup for a B2B cultivation operation.

**1. Cultivator Profile & Core Setup**
- Navigate to **Admin -> Settings**.
- Verify the Organization Name and ensure the type reflects cultivation/wholesale defaults.
- Navigate to **Admin -> App Store**.
- Connect the **LeafLink** (or equivalent wholesale platform) integration and verify the sync status.

**2. Access & Team Structure**
- Navigate to the **Invite Team Member** component in the sidebar.
- Simulate sending an invite to `test-sales-rep@bakedbot.ai` with the allowed grower roles (e.g., `grower` or `brand_member`).
- Verify the invite registers in the active directory and roles are properly restricted preventing access to POS retail settings.

---

## 📅 Day 2: Harvests, Catalog & Strains
**Objective**: Test strain-level product creation and B2B pricing configurations.

**1. My Strains & SKUs**
- Navigate to **Catalog -> My Strains & SKUs**.
- Create a new Strain (e.g., "Blue Dream - Indoor") with wholesale properties.
- Verify cultivation-specific metadata fields if present (e.g., Yield, THC%, Harvest Date).
- Ensure a mockup COA (Certificate of Analysis) PDF can be uploaded and attached to the SKU.

**2. Wholesale Pricing**
- Navigate to **Catalog -> Pricing**.
- Configure tiered wholesale pricing rules (e.g., "1-5 lbs: $1,200/lb", "5+ lbs: $1,050/lb").
- Verify that these margins apply correctly to the newly created Strains.

---

## 📅 Day 3: B2B Distribution & Orders
**Objective**: Test the CRM connections with Retail Buyers and the wholesale checkout tracking.

**1. Retail Buyers (CRM)**
- Navigate to **Distribution -> Retail Buyers**.
- Add a new Dispensary partner to the buyer network (e.g., "Essex Pilot Dispensary").
- Assign a specific "Preferred Partner" pricing tier to them.

**2. Wholesale Orders**
- Navigate to **Distribution -> Orders**.
- Create a mock incoming wholesale Purchase Order (PO) from the Retail Buyer for 10 lbs of "Blue Dream".
- Process the Order status sequence: Pending -> Invoice Sent -> Payment Received -> Dispatched.

---

## 📅 Day 4: Deals, Operations, & Workspace
**Objective**: Validate proactive deal-making intelligence and inbox CRM.

**1. Communications & Negotiations**
- Navigate to **Workspace -> Inbox**.
- Simulate an incoming wholesale inquiry from a dispensary buyer asking for a bulk discount.
- Use the Inbox AI (Inbox Mike) to draft an automated reply quoting the pricing tiers set on Day 2.
- Navigate to **Workspace -> Playbooks**.
- Execute a "Surplus Inventory Push" playbook to simulated buyers.

---

## 📅 Day 5: Financials & Intelligence
**Objective**: Validate analytical accuracy for wholesale ledgers and evaluate market demand.

**1. Wholesale Ledgers**
- Navigate to **Financials -> GreenLedger** (NEW).
- Audit the payment receipts generated from the Purchase Orders completed on Day 3.
- Navigate to **Financials -> Analytics**.
- Review wholesale volume charts and top-performing strains by revenue.

**2. Market Intelligence**
- Navigate to **Intelligence -> Competitive Intel**.
- Search for "Blue Dream" bulk pricing in the local regional market.
- Navigate to **Intelligence -> Deep Research** (BETA).
- Launch an AI agent research request: "Analyze wholesale price compression trends for indoor flower over the last 90 days." Validate the task submits without crashing.

---
*Agent Execution Rules: If any B2B specific logic fails (e.g. wholesale tier calculation breaks, Deep Research throws a 500 error), file a bug under the `wholesale_grower` area in `dev/backlog.json`.*
