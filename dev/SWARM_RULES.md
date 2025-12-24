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

## 7. Secret Management Protocol (App Hosting)
**CRITICAL**: After ANY changes to `apphosting.yaml` secrets, grant access for **ALL** secrets.

Firebase App Hosting uses multiple service accounts. Partial fixes cause production outages (see: 2025-12-24 incident).

### After Modifying Secrets:
```bash
# Run for EVERY secret in apphosting.yaml, not just new ones
firebase apphosting:secrets:grantaccess FIREBASE_SERVICE_ACCOUNT_KEY --backend bakedbot-prod --project studio-567050101-bc6e8
firebase apphosting:secrets:grantaccess SENDGRID_API_KEY --backend bakedbot-prod --project studio-567050101-bc6e8
firebase apphosting:secrets:grantaccess MAILJET_API_KEY --backend bakedbot-prod --project studio-567050101-bc6e8
firebase apphosting:secrets:grantaccess MAILJET_SECRET_KEY --backend bakedbot-prod --project studio-567050101-bc6e8
firebase apphosting:secrets:grantaccess CANNMENUS_API_KEY --backend bakedbot-prod --project studio-567050101-bc6e8
firebase apphosting:secrets:grantaccess SERPER_API_KEY --backend bakedbot-prod --project studio-567050101-bc6e8
firebase apphosting:secrets:grantaccess STRIPE_SECRET_KEY --backend bakedbot-prod --project studio-567050101-bc6e8
```

### Warning Signs:
- 500 errors on homepage AND favicon = server initialization crash (likely secret access issue)
- Build fails with "Misconfigured Secret" = missing permissions
