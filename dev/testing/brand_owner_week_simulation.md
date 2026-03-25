# Brand Owner QA Loop: One Week Simulation (Ecstatic Edibles Profile)

**Purpose**: This document provides a loop-based testing curriculum for AI Agents simulating a **Brand Owner** (`online_only` e-commerce model, e.g., Ecstatic Edibles).

**Goal**: Execute continuously to clear bugs specific to the Brand-side CRM, direct-to-consumer e-commerce, and national shipping models.

---

## 📅 Day 1: Brand Foundation & Identity
**Objective**: Verify the initial setup for an online hemp/CBD brand.

**1. Profile & Theme**
- Navigate to **Admin -> Settings** (*Brand Profile*).
- Verify the Organization Name is "Ecstatic Edibles" and type is "brand".
- Check the **Theme** configurations: Verify Primary Color `#bb0a1e` (Ecstatic Red), Secondary Color `#000000`, and Accent `#FFFFFF`.
- Navigate to **Admin -> Custom Domains**.
- Verify the domain `ecstaticedibles.bakedbot.ai` is attached.

**2. Chatbot Persona (Eddie)**
- Navigate to **Admin -> Settings** (Chatbot Config).
- Verify the bot name is "Eddie".
- Send a test prompt to the preview bot: "What kind of edibles do you have?" and assert it responds with the configured personality (friendly, enthusiastic about hemp).

**3. Payments & Logistics**
- Navigate to **Admin -> Settings** (E-commerce).
- Verify `purchaseModel` is `online_only` and `shipsNationwide` is true.
- Verify the payment provider is set to `authorize_net`.

---

## 📅 Day 2: Catalog & Merchandising
**Objective**: Test product creation, specific hemp metadata (mg per serving), and catalog variants.

**1. Product Validation**
- Navigate to **Menu & Inventory -> Products**.
- Assert the existence of exactly 3 core pilot products:
  1. Snicker Doodle Bites ($10.00)
  2. Berry Cheesecake Gummies ($10.00)
  3. "If You Hit This We Go Together" Hoodie ($40.00)
- Click into the "Berry Cheesecake Gummies".
- Verify Hemp/Edible specific fields: `Weight: 30g`, `Servings: 6`, `mgPerServing: 10`.

**2. Visuals & Carousels**
- Prompt the Agent to simulate uploading/linking a product image for the Snicker Doodle Bites.
- Navigate to **Menu & Inventory -> Carousels**.
- Create a "Best Sellers" carousel adding both edible items.

---

## 📅 Day 3: Direct-to-Consumer Commerce
**Objective**: Test the checkout pipeline for an online-only brand.

**1. The Checkout Flow**
- Navigate to the simulated storefront (Brand Page preview).
- Add the "Snicker Doodle Bites" to the cart.
- Proceed to checkout. Simulate a guest user providing a national shipping address (e.g., in NY or TX).
- Assert that shipping options appear (since `shippingEnabled` is true and `freeShipping` is true).
- Submit a mock Authorize.net test card payload.

**2. Order Management**
- Navigate to **Commerce -> Orders** in the dashboard.
- Locate the newly created D2C order.
- Move the status from "New" to "Shipped" and mock a tracking number payload.

---

## 📅 Day 4: Campaigns & Audience
**Objective**: Test national outreach for direct shipping customers.

**1. Content Generation**
- Navigate to **Marketing -> Creative Center**.
- Prompt the Creative AI: "A stylish streetwear model wearing a black hoodie that says 'Ecstatic Edibles', urban background."
- Save the asset for the Apparel push.

**2. Nationwide Campaign**
- Navigate to **Marketing -> Campaigns**.
- Create a New Campaign -> "Merch Drop".
- Select Email Channel. Use the generated Apparal asset.
- Target Segment: Create an ad-hoc segment for `All Customers (Nationwide)`.
- Send a test email layout to the intercept email `ecstaticedibles@bakedbot.ai`.

---

## 📅 Day 5: Performance & Strategy
**Objective**: Validate analytics for shipping-based commerce.

**1. Analytics**
- Navigate to **Strategy -> Analytics**.
- Review the "Top Seller" tile. Assert that "Snicker Doodle Bites" (or whichever had the mock order) reflects revenue.
- View the **Geographic Heatmap** (if enabled) to verify out-of-state shipping volumes populate correctly.

**2. Workspace Communications**
- Navigate to **Workspace -> Inbox**.
- Simulate an incoming customer email asking about Delta-8 shipping restrictions.
- Have the AI drafting tool (Inbox Mike) propose a reply confirming nationwide hemp shipping legalities. 

---
*Agent Execution Rules: If any D2C specific logic fails (e.g. shipping address rejected incorrectly, Authorize.net hooks fail), file a bug under the `brand_ecom` area in `dev/backlog.json`.*
