# Dispensary Owner QA Loop: One Week Simulation

**Purpose**: This document provides a comprehensive, loop-based testing curriculum for AI Agents (like Kusho/Playwright/Linus) to simulate a dispensary owner using the BakedBot platform over a simulated 5-day week.

**Goal**: Execute these loops continuously to achieve a bug-free state across all integrated modules before rollout.

---

## 📅 Day 1: Foundation & Setup
**Objective**: Build the initial brand and app infrastructure.

**1. Admin & Core Setup**
- Navigate to **Admin -> Settings**.
- Verify organization defaults and correct timezone.
- Navigate to **Admin -> Custom Domains**.
- Attach a mock domain (e.g., `test-dispensary.shop`) and verify DNS status simulation.
- Navigate to **Admin -> Email Warm-up**.
- Verify IP warming status.
- Navigate to **Admin -> App Store**.
- Ensure the Alleaves POS integration is fully 'Connected'.

**2. Customers (Mrs. Parker)**
- Navigate to **Customers -> Loyalty Settings**.
- Configure the point multiplier (e.g., $1 = 1 point).
- Configure two Loyalty Tiers (e.g., "Silver" at 500pts, "Gold" at 1000pts).
- Navigate to **Customers -> QR Sign-up**.
- Generate a new VIP sign-up QR code, copy the link, and simulate a guest registration.

**3. Marketing Foundation**
- Navigate to **Marketing -> Brand Guide**.
- Upload a simulated logo and define core hex colors.
- Navigate to **Marketing -> Brands We Carry**.
- Search and add 3 known partner brands (e.g., "Wana", "Cresco", "Stiiizy").
- Navigate to **Marketing -> Vibe Studio**.
- Save one global Vibe preset (e.g., "Weekend Euphoria").

---

## 📅 Day 2: Menu, Inventory & Pricing
**Objective**: Guarantee that data from the POS syncs flawlessly and merchandising tools work.

**1. Menu & Inventory**
- Navigate to **Menu & Inventory -> Products**.
- Verify that a list of products populated (assert count > 0).
- Open a specific product, check inventory numbers, THC levels, and images.
- Navigate to **Menu & Inventory -> Carousels**.
- Create a new "Staff Picks" carousel. Select 4 items and publish.
- Navigate to **Menu & Inventory -> Hero Banners**.
- Activate a promotional banner for "Buy 2 Get 1 Free Wana Gummies".

**2. Commerce & Merchandising**
- Navigate to **Menu & Inventory -> Bundles**.
- Create a "Weekend Starter Kit" bundle (linking an 8th of flower and a pack of pre-rolls) and assign a bundle price.
- Navigate to **Commerce -> Pricing**.
- Assert wholesale/retail markup rules. Save a new rule: "+10% on all concentrates during weekends".
- Navigate to **Commerce -> Smart Upsells [NEW]**.
- Enable "Pairing Engine". Simulate an API call payload adding an 8th to the cart; verify output recommends a lighter or pre-roll.

---

## 📅 Day 3: Strategy & Intelligence
**Objective**: Observe data, extract insights, and spy on the market.

**1. Strategy (Pops)**
- Navigate to **Strategy -> Goals**.
- Define a revenue target of $50,000 for the simulated week.
- Navigate to **Strategy -> Analytics**.
- Review dashboard loads without 500s. Toggle date ranges (7 Days vs 30 Days).
- Check the **Top Seller This Week vs Last** metric tile to ensure it renders data (or empty state gracefully if no mock data).

**2. Intelligence (Ezal)**
- Navigate to **Intelligence -> Market Intel**.
- Input a local zip code, verify opponent dispensaries render.
- Check the **TOP SELLER THIS WEEK** leaderboard. 
- Navigate to **Intelligence -> GreenLedger [NEW]**.
- Export the audit trail of smart menu pricing changes from Day 2.

---

## 📅 Day 4: Campaigns & Marketing
**Objective**: Re-engage the VIP users created on Day 1.

**1. Content Creation**
- Navigate to **Marketing -> Creative Center**.
- Prompt the Agent to generate an image for a "Friday Flower Drop". Wait for generation.
- Save asset to the Library.

**2. Campaigns Dispatch**
- Navigate to **Marketing -> Campaigns**.
- Create a New Campaign -> "Friday Flower Promo".
- Select SMS Channel.
- Use the **Creative Center** asset link. 
- Select target audience: The segment created via **QR Sign-up** (Day 1).
- Send test SMS to the hardcoded intercept number. Verify delivery log.

---

## 📅 Day 5: Operations & Fulfillment
**Objective**: Validate real-world daily actions.

**1. Fulfillment**
- Navigate to **Commerce -> Orders**.
- Create a mock order payload. Verify it appears in the "New" column.
- Move order to "Packed", then to "Completed".
- Navigate to **Commerce -> Delivery**.
- Assign the completed order to a simulated Driver ID.

**2. Workspace Communications**
- Navigate to **Workspace -> Inbox**.
- Simulate an incoming customer SMS. Reply via the Inbox.
- Navigate to **Workspace -> Projects**.
- Mark the task "Rollout Loyalty Program" as Complete.
- Navigate to **Workspace -> Playbooks**.
- Run the "Price Match Competitor" playbook manually.
- Navigate to **Workspace -> Drive**.
- Verify generated campaign images and exported CSV ledgers exist in the drive.

**3. Weekly Review (Mrs. Parker)**
- Navigate to **Customers -> Customers**.
- Filter by "Gold Tier" to ensure tier advancement logic triggered correctly.
- Navigate to **Customers -> Segments**.
- Create a dynamic segment for "Users who bought Bundles".
- Check the **LOYALTY PERFORMANCE** dashboard to evaluate points liabilities.

---
*Agent Execution Rules: If any step encounters an HTTP 5XX, an unresponsive selector, or a layout shift preventing click, the Agent MUST file a bug in `dev/backlog.json` via the `qa_bugs` pipeline.*
