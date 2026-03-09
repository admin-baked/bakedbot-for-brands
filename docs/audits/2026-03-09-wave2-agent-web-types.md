# BakedBot Code Audit (Wave 2) — Agent-Web and Embed Type Tightening

**Date:** 2026-03-09  
**Scope:** Continue AI debt reduction by removing high-signal `any` usage in runtime paths and introducing reusable typed contracts.

## Changes shipped

1. Added `src/types/public-menu-settings.ts` as a reusable typed contract for public loyalty/menu settings consumed by agent-web generators.
2. Updated `src/lib/agent-web/llm-txt-generator.ts` to use `PublicMenuSettings` instead of `any`.
3. Updated `src/lib/agent-web/schema-org-builder.ts` to use `PublicMenuSettings` and removed inline explicit-`any` suppressions.
4. Updated `src/embed/mock-logger.ts` to use `unknown` payloads instead of `any`.

## Why this wave matters

- Removes permissive typing in machine-readable agent output generation paths.
- Replaces duplicated ad-hoc inline typing with a canonical reusable interface.
- Strengthens embed runtime logging contracts without reducing flexibility.

## Follow-up recommendations

- Continue replacing broad `any` in shared `src/types/*` modules, prioritizing tool/task/event contracts.
- Add targeted contract tests for `llm-txt-generator` and `schema-org-builder` output shape.
- Add lint rule and dashboard metric for new explicit-`any` additions in Tier 2/Tier 3 paths.
