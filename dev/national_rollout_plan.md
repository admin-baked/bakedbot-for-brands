# BakedBot AI: Pricing + National Rollout Plan (Foot Traffic Pages)

## Purpose

Build the national discovery layer for cannabis (legal markets first, hemp/THCA second), monetize via **recurring “Claim” subscriptions**, and ladder customers into higher tiers (Growth/Scale). This document aligns pricing with our page-generation plan, bulk import workflow, and agent execution.

---

## Core Strategy (How revenue is created)

1. **Publish unclaimed pages at scale** (Brand + Dispensary + ZIP pages) for SEO discovery.
2. Drive operators to pages organically and via direct discovery loops.
3. Convert operators with a **low-friction “Claim Pro” subscription** that unlocks control + proof.
4. Upsell to Growth/Scale tiers for multi-location outcomes (budtender, marketing playbooks, advanced analytics).

---

## Pricing Model (MRR-first, launch-friendly)

### A) Unclaimed Listing (Free)

* **$0/mo**
* Page exists publicly for SEO/discovery
* Limited editing (system-sourced data only)
* Clear CTA: **“Claim this Page”**

### B) Claim Pro (Core MRR Engine)

**$99/mo** (default)
Includes:
* Verified badge
* Edit business/brand info (description, links, socials)
* CTA control (Order / Find-in-store / Deals / Website)
* Basic analytics (views, clicks, searches, top ZIPs)
* Lead capture (email/SMS form) with compliance gating (Deebo)
* Data correction workflow (“report issue” → admin review)

**Why subscription (not one-time):** pages require ongoing sync + SEO iteration + analytics + compliance guardrails.

### C) Founders Claim (Scarcity without killing MRR)

Use scarcity to induce demand, but keep it recurring:
* **$79/mo locked-in for life** (first 100–250 claims)
  OR
* **$799/year prepaid** (cash-now, same benefits)

### D) Coverage Packs (Monetize national brands)

Tie pricing to ZIP coverage (matches our rollout plan):
* Claim Pro includes **X ZIP pages** (e.g., 25 ZIPs or 1 core market)
* **Coverage Pack +$49/mo** for +100 ZIPs
* **Coverage Pack +$149/mo** for +500 ZIPs

This avoids reinventing tiers while giving a clear path for brands with wide distribution.

---

## Subscription Ladder (Existing tiers + how Claim fits)

| Tier       |   Price | Target                             | Includes                                                      |
| ---------- | ------: | ---------------------------------- | ------------------------------------------------------------- |
| Free       |   $0/mo | Brands getting started             | Unclaimed listing + basic discovery                           |
| Claim Pro  |  $99/mo | Operators who want control + proof | Verified, edits, CTA, basic analytics, lead capture           |
| Growth     | $350/mo | Growing brands (≈5 locations)      | Claim Pro + deeper analytics + playbooks + automation starter |
| Scale      | $700/mo | Established brands (≈10 locations) | Full automation + multi-market optimization                   |
| Enterprise |  Custom | MSOs + large brands                | Integrations, custom rule packs, priority support             |

**Rule:** Growth/Scale should include Claim Pro value by default (Claim becomes the entry, not a separate confusing product).

---

## Revenue Targets (Simple math, realistic blend)

Goal: **$10K MRR** from page claims + upgrades.

Example blended path:
* 60 × $99 = $5,940
* 10 × $350 = $3,500
* 2 × $700 = $1,400
  = **$10,840 MRR**

This makes Claim Pro the volume engine while Growth/Scale provides acceleration.

---

## Product Requirements (What “Claim Pro” must actually unlock)

Minimum viable Claim Pro must include:
1. **Verified badge**
2. **Edit fields** (name, logo, description, website, socials, hours, locations)
3. **CTA routing** (single primary CTA + optional secondary CTA)
4. **Basic analytics** (views, clicks, top ZIPs, top pages)
5. **Lead capture** (form + CRM export / webhook)
6. **Audit trail** (who edited what, when)
7. **Compliance guardrails** (Deebo pre-check on public copy + CTA labels)

---

## National Rollout Plan (Two Tracks)

### Track 1: Legal Cannabis (Adult-use + Medical)

**Objective:** Complete coverage across all legal states via Brand + Dispensary + ZIP page generation.

* Input: `legal_cannabis_zipcodes.csv`
* Output: bulk-generated pages per ZIP + per entity

**Data hydration:** pull “where to buy” coverage by ZIP from CannMenus (dispensaries + inventory/brand presence).

### Track 2: Hemp / THCA (Non-legal cannabis markets)

**Objective:** Expand discovery + commerce where allowed, with strict compliance gating.

* Deebo-driven allowlist/denylist by state + product category
* Education-first pages + compliant commerce routing

---

## Execution Workflow (Agents + Dev)

### Agentic Testing & Verification
We utilize the **Agent Sandbox** (`/dashboard/ceo/sandbox`) as the primary testing ground for rollout agents.
*   **Sandbox Chat**: Simulate user interactions with Smokey/Craig/Pops before live deployment.
*   **Tool Verification**: Test individual tools (`marketing.sendEmail`, `geo.search`, etc.) in isolation.
*   **Debug Reports**: Analyze execution traces and cost/latency metrics for each agent step.
*   **Seed Data**: Use the "Seed Sandbox" action to generate ephemeral test scenarios without polluting production data.
*   **Browser Capability Audit**: Verify Linus and Builder Agent can successfully navigate, audit, and extract data from live pages using the new Playwright/Cheerio service.

### CannMenus Data Pull (Hydration)

**How ZIP coverage enters the system (no bulk import):**
* We **add ZIP codes directly into the tool** (using the ZIP dataset), which creates the base coverage map for pages.
* Pages are then hydrated with real inventory + location data.

**Scan-first approach to reduce CannMenus calls:**
We use a **City Scanning tool** to minimize API calls by:
1. Grouping ZIPs by **city + state**
2. Scanning each city once (or on a controlled cadence) to discover:
   * dispensaries in/near that city
   * canonical CannMenus identifiers/URLs
   * rough inventory/brand presence signals
3. Caching scan results so we don’t re-query CannMenus for every ZIP.

**Hydration workflow (ZIP → City → Dispensary → Brand graph):**
For each city/state discovered from the ZIP list:
* **City Scan**: pull candidate dispensaries for the city and store them in our DB
* **Dispensary Fetch** (only for new/changed): pull menu metadata + last-updated signals
* **Brand/Inventory Map**: derive which brands are carried and in which ZIPs
* **ZIP Page Populate**: apply the derived coverage back onto all ZIP pages in that city

**Caching + change detection:**
* Cache city scans (TTL-based) and only refresh when:
  * scan TTL expires
  * a claim triggers a “freshness required” refresh
  * the system detects large menu changes (if available)

**Outputs per ZIP page:**
* Nearby dispensaries (ranked by distance/availability)
* Brands carried signal (and top SKUs if present)
* Where-to-buy list for each brand

### Claim Conversion Loop

For each ZIP:
* Query nearby dispensaries
* Pull menu/inventory metadata
* Build “brands carried” graph
* Populate brand pages with:
  * top products
  * availability signal
  * where-to-buy list

### 3) Claim Conversion Loop

When page traffic crosses thresholds:
* Pops flags “high intent” pages
* Craig triggers outreach sequences (brand + dispensary)
* In-product banners push: **Claim Pro** / **Founders Claim**

---

## Launch Plan (How we roll this out)

### Phase 0: Foundations
* Bulk import working
* Brand Page Creator UI + Dispensary generator
* Claim Pro billing + entitlements

### Phase 1: Pilot
* Seed pages in top ZIPs (initial target markets)
* Validate indexing + conversion to Claim Pro

### Phase 2: Ramp
* Mass generate pages across all legal markets
* Start Founders Claim scarcity campaign

### Phase 3: Scale
* Expand Coverage Packs
* Add Track 2 (Hemp/THCA) with Deebo gating

---

## KPIs (What Pops should report)

* Indexed pages (count)
* Organic impressions/clicks by page type
* Claim conversion rate (views → claim)
* Churn rate (Claim Pro)
* ARPA (average revenue per account)
* Upsell rate (Claim → Growth/Scale)
* Coverage utilization (ZIPs per claimed account)

---

## CRM Definitions (Clarification)

### 1. Platform CRM (Super Admin)
**Target:** Brands & Dispensaries (B2B Leads).
**Sources:** Agent Playground (Homepage), Claim Flow, Contact Forms.
**Goal:** Convert Leads → Paid Subscribers (Claim Pro/Growth).
**Stored in:** `leads` collection, `foot_traffic/crm/brands` & `dispensaries`.

### 2. Tenant CRM (Brand/Dispensary Dashboard)
**Target:** Cannabis Shoppers (B2C Customers).
**Sources:** Menu Orders, Smokey Chat, POS Connectors.
**Goal:** Convert Shoppers → Repeat Buyers.
**Stored in:** `tenants/{tenantId}/customers`.

---

## Decision Summary

* **Claim should be subscription-based** (default $99/mo) to fund ongoing value.
* Use **Founders Claim** to induce urgency while preserving MRR.
* Add **Coverage Packs** to monetize national footprint without complicating tiers.
* Roll out nationally in two tracks, starting with **legal cannabis** using the ZIP dataset and CannMenus hydration.

---

Owner: Martez Knox
Last updated: Dec 16, 2025
