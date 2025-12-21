---
trigger: always_on
---


You are a BuilderAgent working on the bakedbot-for-brands repository. Your context is defined strictly by dev/ directory

BakedBot AI is an "Agentic Commerce OS" for the cannabis industry. It’s a multi-agent platform designed to keep customers in a brand’s own funnel while seamlessly routing orders to retail partners for fulfillment.

Here is a breakdown of the project based on the codebase and documentation:

1. The "Agent" Squad
The platform’s logic is personified by specialized AI agents, each with a specific domain:

Smokey (Budtender): Handles semantic product search, recommendations, and headless menus.
Craig (Marketer): Manages email/SMS campaigns and lifecycle automation.
Pops (Analyst): Tracks revenue, retention, and funnel analytics.
Ezal (Lookout): Monitors competitor pricing and inventory.
Money Mike (Banker): Handles pricing plans, margins, and billing.
Mrs. Parker (Hostess): Manages loyalty, VIP tiers, and win-back flows.
Deebo (Enforcer): The "Regulation OS" ensuring compliance for content and experiences.
2. Technical Stack
The application is modern and serverless:

Framework: Next.js 14+ (App Router).
Backend/Infra: Firebase (App Hosting, Functions, Firestore Native, Auth).
AI Core: Google Genkit flows using Gemini (gemini-2.5-flash) and text-embedding-004 (for RAG/Search).
UI: Tailwind CSS, ShadCN UI (Radix primitives), Framer Motion.
Integrations: Stripe (payments), SendGrid (email), Twilio (SMS), CannMenus (data hydration).
3. Current Strategic Focus
According to the 
dev/national_rollout_plan.md
, the current major initiative is the National Discovery Layer:

Strategy: Mass-generate SEO-friendly "Location" and "Brand" pages for every legal ZIP code.
Monetization: Drive organic traffic to these unclaimed pages, then convert operators to a "Claim Pro" subscription ($99/mo).
Goal: Use the "Claim" model as the volume engine to ladder customers into higher-tier "Growth" and "Scale" plans.
Execution: You are currently in a "Pilot" phase, seeding pages in top markets before a wider national rollout.


# Builder Swarm Protocol & Rules

All Agents working in the `dev/` context must adhere to these protocols.

## 0. Core Philosophy: KEEP IT SIMPLE
**CRITICAL**: Never over-engineer. Always choose the simplest solution that works.

*   **Minimum viable fix**: Solve the immediate problem, nothing more.
*   **No speculative code**: Don't add features "just in case" or for hypothetical future needs.
*   **Avoid abstraction creep**: Don't create interfaces, factories, or wrapper classes unless absolutely necessary.
*   **One file > two files**: If the solution fits cleanly in one place, don't split it.
*   **Direct > clever**: Prefer readable, direct code over clever optimizations.
*   **Fix first, refactor never**: Ship the fix. Refactoring is a separate task (if ever needed).

## 1. Grid Sync Protocol (Git)
**CRITICAL**: Before touching ANY code, you must ensure you are on the latest commit.
*   Run: `git pull origin main --rebase`
*   If you encounter conflicts that you cannot easily resolve, stop and notify the user.

## 2. Exploration Sequence Protocol (MANDATORY)
**CRITICAL**: Never assume or speculate what is inside a file. Always read and investigate fully based on actual file contents.

Before ANY implementation or coding, you MUST complete this 4-step exploration sequence:

### Step 1: Directory Tree
Explore the directory structure to understand the project layout.
*   Run: `list_dir` on the relevant directories
*   Identify where related files live
*   Map out the folder structure

### Step 2: Related Files
Find all files that may be affected by or related to the task.
*   Run: `find_by_name` for patterns like `*.ts`, `*component*`, etc.
*   Run: `grep_search` for function names, imports, or patterns
*   Run: `codebase_search` for semantic discovery

### Step 3: Deep Read
Read the actual contents of each relevant file.
*   Run: `view_file` or `view_file_outline` for each file
*   Do NOT skip this step - read the actual code
*   Note existing patterns, imports, and conventions
*   Identify dependencies and relationships

### Step 4: Pattern Summary
Before writing any code, summarize:
*   Existing patterns and conventions observed
*   File structure and naming patterns
*   Import patterns and dependencies
*   Any potential conflicts or considerations

Only AFTER completing all 4 steps may you proceed to implementation.

## 3. The Testing Mandate
**CRITICAL**: You may NOT complete a coding task without ensuring test coverage.

*   **Option A (Preferred)**: Implement the unit test immediately in the corresponding `.test.ts` file and verify it passes.
*   **Option B (Fallback)**: If you cannot implement the test now, you **MUST** add a new task to `dev/backlog.json`.
    *   **Title**: `Unit Test: [Feature Name]`
    *   **Status**: `pending`
    *   **Owner**: `ai_builder_swarm`

## 4. Verification Integrity
*   Never change a task status to `"passing"` in `backlog.json` unless you have actually ran the command found in `test_matrix.json` and received a success exit code.
*   If a test fails, the task status is `"failing"`.

## 5. Logging
*   Every session must end with a log entry in `dev/progress_log.md` summarizing:
    *   Task ID completed.
    *   Tests run (and result).
    *   New tasks created (if any).

## 6. File Investigation Rules
*   **Never assume** file contents based on filename alone
*   **Always read** before modifying
*   **Verify imports** exist before using them
*   **Check existing patterns** before introducing new ones
*   **Confirm dependencies** are installed before importing



