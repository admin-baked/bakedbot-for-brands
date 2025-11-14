
# Code Cleanup Action Plan

Follow this step-by-step plan to safely and effectively clean up the codebase. Always commit your changes after each major step.

## Phase 1: Quick Wins (Low Risk, High Impact)

**Goal**: Address the easiest-to-fix issues found by the `quick-audit.sh` script.

### Step 1: Create a Baseline

1.  **Create a new branch**:
    ```bash
    git checkout -b feature/code-cleanup
    ```
2.  **Run the quick audit**:
    ```bash
    npm run audit
    ```
3.  **Review the reports** in the `audit-reports/` directory to understand the current state.

### Step 2: Remove `console.log` Statements

1.  Open `audit-reports/console-logs.txt`.
2.  Go through each file and line number, and remove any `console.log` statements that were left in for debugging.
3.  **Commit your changes**:
    ```bash
    git add .
    git commit -m "chore: remove console.log statements"
    ```

### Step 3: Address TODOs and FIXMEs

1.  Open `audit-reports/todos-and-fixmes.txt`.
2.  Review each comment. Either:
    -   Fix the issue the comment describes.
    -   Create a formal ticket/issue in your project management tool and then remove the comment.
    -   If the comment is no longer relevant, delete it.
3.  **Commit your changes**.

### Step 4: Delete Commented-Out Code

1.  Review `audit-reports/commented-code.txt`. This report can have false positives, so be careful.
2.  If a line is clearly old, unused code that is commented out, delete it. **If you are unsure, leave it.**
3.  **Commit your changes**.

### Step 5: Optimize Firebase Imports

1.  Review `audit-reports/firebase-imports.txt`.
2.  Follow the guide in `docs/FIREBASE_OPTIMIZATION.md` to refactor any full-package imports (`import firebase from 'firebase/app'`) to modular imports (`import { getAuth } from 'firebase/auth'`).
3.  **Commit your changes**.

## Phase 2: Deeper Cleanup (Medium Risk)

**Goal**: Use the deep audit tools to remove unused code and dependencies.

### Step 6: Run the Deep Audit

1.  Ensure you have run `npm install`.
2.  Run the deep audit script:
    ```bash
    npm run audit:deep
    ```
    This will generate new reports and open the bundle analyzer in your browser.

### Step 7: Remove Unused Dependencies

1.  Open `audit-reports/unused-dependencies.txt`.
2.  For each package listed under "Unused dependencies", run:
    ```bash
    npm uninstall <package-name>
    ```
3.  For each package under "Unused devDependencies", run:
    ```bash
    npm uninstall -D <package-name>
    ```
4.  After removing dependencies, run the app and tests to ensure nothing broke:
    ```bash
    npm run build
    # Run tests if you have them
    ```
5.  **Commit your changes**.

### Step 8: Prune Unused Exports

1.  Open `audit-reports/unused-exports.txt`. This file lists exported functions, types, and variables that are not imported anywhere.
2.  **This is a high-risk step.** Before deleting an export, be certain it's not used in a way the tool can't detect (e.g., passed as a prop).
3.  Carefully delete or un-export the items listed.
4.  After each significant change, run `npm run build` to check for errors.
5.  **Commit your changes frequently**.

### Step 9: Address Duplicate Code

1.  Open `audit-reports/code-duplication-report.md`.
2.  Review the report to find instances of duplicated code blocks.
3.  Where appropriate, refactor the duplicated code into a shared component or utility function.
4.  **Commit your changes**.

## Phase 3: Final Review

### Step 10: Review Bundle Analyzer

1.  If it's not still open, run the analyzer again:
    ```bash
    npm run analyze
    ```
2.  Explore the visualization to understand what's contributing most to your bundle size.
3.  Look for large libraries that could be replaced with smaller alternatives or opportunities for code-splitting with `next/dynamic`.

### Step 11: Final Testing

1.  Thoroughly test the application.
2.  Run `npm run build` one last time.
3.  Merge your `feature/code-cleanup` branch back into your main branch.

Congratulations! Your codebase is now significantly cleaner and more optimized. Schedule a reminder to run these audits again in a month or two.
