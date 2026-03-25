# Super User QA Loop: One Week Simulation (Platform Administrator)

**Purpose**: This document provides a loop-based testing curriculum for AI Agents simulating a **Super User** (`super_user` role, CEO Boardroom access, CLI powers).

**Goal**: Execute continuously to ensure platform-wide stability, test global executive agent interactions, and validate security/integrity gates across orgs.

---

## 📅 Day 1: System Health, Security Audits, & Access Management
**Objective**: Ensure the platform infrastructure and security perimeters are intact.

**1. CLI Super Powers & Provisioning**
- From the terminal, execute `npm run test:security` (SP7).
- Assert that all 293+ RBAC and prompt-guard tests pass before proceeding.
- Execute `npm run promote-super-user-by-email.mjs test-admin-bot@bakedbot.ai` to ensure the promo script functions.
- Verify the script correctly attaches `{ role: 'super_user' }` custom claims to the Firebase Auth token.

**2. Database Integrity Checks**
- Execute `npm run audit:schema` (SP3) and `npm run audit:consistency` (SP9).
- Ensure no orphaned documents or invalid schema references exist in the current staging environment.

---

## 📅 Day 2: The Executive Boardroom (AI Leadership)
**Objective**: Interact with the high-level executive agents ensuring cross-org visibility.

**1. Morning Briefing & CEO Dashboard**
- Navigate to **Boardroom -> CEO Dashboard** (`/dashboard/ceo`).
- Review the auto-generated **Morning Briefing**. Assert that revenue, new sign-ups, and active anomaly data populates correctly for the day.
- Verify that GLM usage metrics (Claude/Gemini requests) correctly map against the platform-wide token caps.

**2. Executive Delegation**
- Navigate to the **Executive Agents** tab.
- Ping **Leo (COO)**: "What is the status of the NY Delivery implementation?" Verify Leo coordinates with Delivery Dante data.
- Ping **Jack (CRO)**: "Summarize top 3 revenue-generating dispensaries this week." Verify Jack returns aggregated CRM/Revenue data.
- Ping **Glenda (CMO)**: "Draft a global PR release about the new GreenLedger feature."

---

## 📅 Day 3: Global QA, Routing, & Bug Triage
**Objective**: Verify the built-in AI engineer routing and bug remediation system.

**1. The `qa_bugs` Pipeline**
- Simulate a bug report via Inbox or slack-bot. (e.g., "The menu pricing algorithm is broken on Thrive!").
- Confirm the routing protocol auto-generates a record into the `qa_bugs` Firestore collection.
- Confirm the severity parsing kicks in (e.g., assigning a `P1` or `P0` status due to 'broken pricing').

**2. Engineer Escalation**
- Navigate to the **Quality Assurance** module in the Boardroom. 
- Assert the newly filed `P1` bug appears.
- Click "Assign to Linus" or use the `POST /api/linus/fix` webhook simulation.
- Validate that Linus acknowledges the test failure payload and executes root-cause evaluation.

---

## 📅 Day 4: Playbook Library & Genkit Evals
**Objective**: Manage the core playbook templates that all orgs inherit and run LLM evaluations.

**1. Master Playbooks Template Management**
- Navigate to the **Global Playbook Editor**.
- Open the template for "Price Match Competitor" (which is distributed to all tenant organizations).
- Make a simulated structural modification to the DAG (e.g., adding a new "Delay 1 Hour" node).
- Save the template and verify that the `version` bumps globally.

**2. LLM Golden Set Verification**
- From the terminal, execute evaluation against `smokey-qa.json` and `deebo-compliance.json`.
- Assert that the response matches the compliance rules (≥ 90% pass rate) before modifying any system prompts in production.

---

## 📅 Day 5: Performance monitoring & Cost Analysis
**Objective**: Detect expensive operations and configure alert thresholds.

**1. Cost Analyzer (SP11)**
- Execute `npm run audit:costs` from the CLI.
- Verify the output isolates querying inefficiencies (e.g. any queries reading >1000 docs).

**2. Platform Cron Jobs**
- Execute a manual REST call to `POST /api/cron/heartbeat`.
- Verify the auto-escalation check passes and the `pulse` timestamp in Firestore updates.
- Check Cloud Monitoring metrics (simulated via API logic) to verify 5XX error rates are within expected Service Level Objectives.

---
*Agent Execution Rules: Super Users have destructive powers. Any interaction modifying `users`, `organizations`, or global playbooks MUST cleanly rollback at the end of the simulation using `npm run force_delete.ts [test_entities]`.*
