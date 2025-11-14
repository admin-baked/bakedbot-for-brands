
# Safe Code Cleanup Guide

Cleaning up code can be risky. A wrong deletion can break the application. This guide provides a safety checklist to follow during your cleanup process.

## 📜 The Golden Rule: Commit Frequently

**Before you start, and after every single meaningful change, make a Git commit.** This is your ultimate safety net. If you break something, you can easily revert.

```bash
# Example commit after removing console logs
git commit -m "chore: remove debug console logs from src/app/page.tsx"

# Made a mistake?
git reset --hard HEAD~1 # Go back to the previous commit
```

## ✅ Safety Checklist

Use this checklist for each type of change you make.

### 1. When Deleting Code (Functions, Components, Variables)

-   [ ] **Is this code *truly* unused?**
    -   The `ts-prune` report is a great start, but it's not foolproof.
    -   Search the entire codebase for the name of the function/component you are about to delete.
    -   Could it be used dynamically (e.g., passed as a prop and rendered elsewhere)?
    -   Is it an `export default` from a page file in Next.js? If so, it's a page and should not be deleted.

-   [ ] **Run a Build Check**
    -   After deleting the code, run `npm run build`. This will catch any compile-time errors if the code was actually being imported somewhere.

-   [ ] **Test the Related Feature**
    -   If you deleted a component related to the checkout flow, manually run through the checkout process in your local development environment.

### 2. When Removing an NPM Package (`npm uninstall`)

-   [ ] **Is the package listed in `audit-reports/unused-dependencies.txt`?**
    -   Trust the `depcheck` report, but always verify.

-   [ ] **Search for the package name in the codebase.**
    -   Look for `import ... from 'package-name'` or `require('package-name')`.
    -   If you find any imports, **do not** uninstall the package. The `depcheck` tool may have produced a false positive.

-   [ ] **Check Configuration Files.**
    -   Is the package used in `tailwind.config.ts`, `next.config.js`, or `postcss.config.js`? `depcheck` sometimes misses these.

-   [ ] **Run a Build Check.**
    -   After uninstalling, run `npm run build`. This is the most reliable way to confirm if the package was a necessary build-time dependency.

### 3. When Refactoring (e.g., consolidating duplicate code)

-   [ ] **Do you understand what the code does?**
    -   Don't refactor code you don't understand. You might change its behavior unintentionally.

-   [ ] **Can you create a pure function or a simple component?**
    -   The best refactors extract the duplicated logic into a reusable function or component with clear inputs and outputs, and no side effects.

-   [ ] **Test Before and After.**
    -   Before refactoring, test the feature to confirm its current behavior.
    -   After refactoring, test it again to ensure the behavior is identical.

-   [ ] **Use Git to See Your Changes.**
    -   Before committing, use `git diff` to see exactly what you've changed. This is a great way to catch accidental deletions or typos.

## 🆘 Emergency "Undo" Button

If you've made a series of changes and suddenly the app is broken and you're not sure why:

1.  **Don't panic.**
2.  If you have **not** committed your changes yet, you can discard everything since your last commit:
    ```bash
    git checkout -- .
    ```
3.  If you **have** committed your changes, you can go back to the previous commit:
    ```bash
    git reset --hard HEAD~1
    ```

By following these steps and committing frequently, you can clean up the codebase with confidence and minimal risk.
