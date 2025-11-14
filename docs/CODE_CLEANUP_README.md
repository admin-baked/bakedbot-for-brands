
# Code Cleanup & Optimization Guide

This directory contains scripts and documentation to help you audit, clean, and optimize the application codebase.

## 🚀 Quick Start

1.  **Run the Quick Audit**: This script is fast and requires no new packages. It finds low-hanging fruit like `console.log` statements and commented-out code.
    ```bash
    ./scripts/quick-audit.sh
    ```

2.  **Review Reports**: Check the newly created `audit-reports/` directory for text files summarizing the findings.

3.  **Follow the Action Plan**: Open `docs/CLEANUP_ACTION_PLAN.md` for a step-by-step guide on how to safely address the issues found.

## 🔬 Audit Scripts

There are two main audit scripts available:

### 1. `quick-audit.sh`

-   **What it does**: A fast, read-only scan for common issues.
-   **Checks for**: `console.log`, `TODO`/`FIXME` comments, commented-out code, inefficient Firebase imports, and large files.
-   **How to run**:
    ```bash
    npm run audit
    # or
    ./scripts/quick-audit.sh
    ```

### 2. `audit-code.sh`

-   **What it does**: A deep analysis using specialized tools.
-   **Checks for**: Unused npm packages, unused exported functions/variables (`ts-prune`), and duplicate code (`jscpd`). It also runs the Next.js Bundle Analyzer.
-   **Requires**: `npm install` to have been run.
-   **How to run**:
    ```bash
    npm run audit:deep
    # or
    ./scripts/audit-code.sh
    ```

## 📖 Key Documents

-   **`CLEANUP_ACTION_PLAN.md`**: The main step-by-step guide. Start here after running an audit.
-   **`SAFE_CLEANUP_GUIDE.md`**: A detailed safety checklist to prevent breaking the application during cleanup.
-   **`FIREBASE_OPTIMIZATION.md`**: Specific advice for reducing the bundle size impact of the Firebase SDK.

## 🎯 Goal

The primary goals of this system are to:

-   **Reduce Bundle Size**: Improve loading performance by removing unused code and dependencies.
-   **Improve Code Quality**: Increase maintainability by removing dead code and duplicates.
-   **Establish a Process**: Provide a repeatable system for keeping the codebase clean over time.

Start with the `quick-audit.sh` script and the `CLEANUP_ACTION_PLAN.md` to begin improving the codebase today.
