---
description: Run the 3-agent parallel code review (Code Reuse, Code Quality, Efficiency) on recent changes and auto-fix issues
---
// turbo-all

## Phase 1 - Find Changes

1. Run `git diff HEAD` to capture all modified (unstaged) code.
2. If the diff is empty, run `git diff HEAD~1` to review the last commit.
3. If still empty, identify the most recently modified `.ts` and `.tsx` files via `git log --name-only -1`.

## Phase 2 - Three Parallel Review Agents

Run all three reviews **in parallel** against the diff output from Phase 1.

### Agent 1 - Code Reuse Review
> "Review this diff for CODE REUSE issues. Find places where newly written code duplicates existing utilities, helpers, or patterns already in the codebase. Flag: hand-rolled string manipulation when a util exists, manual path handling, custom env checks, ad-hoc type guards, recreated domain types, parallel helpers when a canonical one exists."

### Agent 2 - Code Quality Review
> "Review this diff for CODE QUALITY anti-patterns. Find: redundant state, parameter sprawl (>4 params without an options object), copy-paste blocks with slight variation, leaky abstractions, stringly-typed code where enums/unions exist, unnecessary JSX nesting, useless comments that restate the code, `any` types that could be narrowed, silent catch blocks."

### Agent 3 - Efficiency Review
> "Review this diff for EFFICIENCY issues. Find: redundant work (computing the same value twice), sequential calls that could be `Promise.all`, N+1 database patterns, missing cleanup or resource leaks, overly broad Firestore reads (loading all docs when you need one), no-op updates in polling loops, unnecessary re-renders, functions that fetch data they already have access to."

## Phase 3 - Fix Issues

3. Aggregate all confirmed findings from the three reviews.
4. Re-check the `AGENTS.md` engineering principles before finalizing: canonical home, reuse, risk tier, failure modes, and observability should still be clear in the final diff.
5. **Directly edit the code** to fix every real problem. Skip false positives without arguing.
6. Run `npm run check:types` to verify fixes don't break the build.
7. Run `npm run simplify:record` once the reviewed code is the exact code you intend to push.
8. Summarize what was changed in a brief report.

## When This Runs

This workflow runs **automatically** after completing any code work and before pushing. `git push` and `npm run push` are blocked until the current outgoing code diff has a matching `npm run simplify:record`.
