# Builder Swarm Protocol & Rules

All Agents working in the `dev/` context must adhere to these protocols.

## 1. Grid Sync Protocol (Git)
**CRITICAL**: Before touching ANY code, you must ensure you are on the latest commit.
*   Run: `git pull origin main --rebase`
*   If you encounter conflicts that you cannot easily resolve, stop and notify the user.

## 2. The Testing Mandate
**CRITICAL**: You may NOT complete a coding task without ensuring test coverage.

*   **Option A (Preferred)**: Implement the unit test immediately in the corresponding `.test.ts` file and verify it passes.
*   **Option B (Fallback)**: If you cannot implement the test now, you **MUST** add a new task to `dev/backlog.json`.
    *   **Title**: `Unit Test: [Feature Name]`
    *   **Status**: `pending`
    *   **Owner**: `ai_builder_swarm`

## 2. Verification Integrity
*   Never change a task status to `"passing"` in `backlog.json` unless you have actually ran the command found in `test_matrix.json` and received a success exit code.
*   If a test fails, the task status is `"failing"`.

## 3. Logging
*   Every session must end with a log entry in `dev/progress_log.md` summarizing:
    *   Task ID completed.
    *   Tests run (and result).
    *   New tasks created (if any).
