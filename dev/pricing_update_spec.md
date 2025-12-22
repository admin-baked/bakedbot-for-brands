# Pricing & Site Structure Update Spec

## 1. Update /pricing page (Directory + Claim Plans)

**Goal:** Two tabs: Directory Plans vs Platform Plans.

### A) Replace Page Intro (Header)
**New Copy:**
> **Simple, Transparent Pricing**
> Start with discovery + claiming. Then add the Agent Workspace when you want automation, reporting, competitive intel, and compliance guardrails.

### B) Add "How it works" block
**Location:** Right under intro.
**Content:**
> **How it works**
> * **Directory Plans** get you discovered and let you claim your page.
> * **Agent Workspace** powers ongoing tasks: daily intel, automated follow-ups, reporting, and compliance checks.
> * Usage is simple: plans include monthly allowances, and you can add coverage when you grow.

### C) Claim Pro ($99/mo) Updates
**Append Bullets:**
* **Agent Workspace (Lite):** run basic tasks (summaries, page updates, quick insights)
* **Intel Preview:** weekly placements + pricing bands (in-app)

### D) Claim Pro (Founders) Updates
**Append Bullet:**
* **Includes Agent Workspace (Lite) + Intel Preview**

### E) Growth/Scale Note
**Add line:**
* Coverage Packs can expand **ZIP/zone pages** and **Market Sensor coverage**.

---

## 2. Homepage Launch Pricing (Platform Plans)

**Goal:** Add "Intel Runs", "Market Sensors", and "Agent Workspace" concepts.

### A) Agent Workspace One-Liner
**Location:** Above tabs (under Launch pricing intro).
**Content:**
> **All agents run inside the Agent Workspace and share the same usage allowance + overages.**

### B) Plan Bullets (Append)

#### Starter
* ✓ **Agent Workspace:** core tasks + basic automations
* ✓ **Intel Starter:** weekly snapshot + up to **10 Market Sensors**

#### Growth
* ✓ **Agent Workspace:** team workflows + automation starter
* ✓ **Intel Growth:** daily snapshot + alerts + up to **50 Market Sensors**

#### Scale
* ✓ **Agent Workspace:** advanced workflows + priority processing
* ✓ **Intel Scale:** daily snapshot + competitor set + up to **200 Market Sensors**

#### Enterprise
* ✓ **Unlimited Intel Runs** + custom Market Sensor coverage
* ✓ Dedicated workflows + integrations

---

## 3. Add-ons Tab

### A) Header Block
**Content:**
> **Agent Workspace Add-ons**
> Add specialized agents as your team grows. They plug into the same data and share your monthly usage allowance.

### B) Descriptions
* **Craig (Marketing Automation)**: Automated email + SMS workflows with compliance pre-checks. Great for claim-to-lead nurture and lifecycle journeys.
* **Pops (Analytics + Forecasting)**: Dashboards, cohorts, and decision-ready reporting across traffic → clicks → claims → outcomes.
* **Ezal (Competitive Intelligence)**: Market Sensors track menus and pricing changes, then summarize what matters (price moves, promos, availability shifts).
* **Deebo Pro (Compliance OS)**: Jurisdiction-aware rule packs, audit trails, and pre-flight checks across web + email + SMS.

---

## 4. Overages Tab

**Add Rows:**
* **Intel Runs**: A generated intelligence output: daily snapshot, weekly summary, alert batch, or scheduled report.
* **Market Sensors**: A monitored menu/URL/retailer tracked for changes during the month.

---

## 5. User Interface Copy

### "Enable Daily Snapshot" Flow
* **Button**: "Enable Daily Snapshot"
* **Permission Screen**: "Connect Gmail to receive your daily snapshot... We’ll only use this connection to send the reports..."
* **Fallback**: "Not now (view in-app only)"

### Settings Defaults
* **Scope**: NY-only (recommended)
* **Delivery**: 8:00 AM America/Chicago
* **Footer**: "Snapshots use your plan’s Intel Runs + Market Sensors. Upgrade anytime if you need more coverage."

---

## implementation Plan
1.  **Commit & Deploy** current Gmail backend.
2.  **Refactor `/pricing` page**:
    *   Implement Tabs (Directory vs Platform).
    *   Update Copy.
3.  **Update Homepage/Launch Pricing components**:
    *   Add new meters.
