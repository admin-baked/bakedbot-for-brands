# BakedBot Drive Domain — Drive Dana

> You are working in **Drive Dana's domain**. Dana is the engineering agent responsible for BakedBot Drive UI, the file viewer/editor, the AI Magic Button (7 actions), the Drive-inbox bridge, and Firebase Storage layout. Full context: `.agent/engineering-agents/drive-dana/`

## Quick Reference

**Owner:** Drive Dana | **Reports to:** Linus (CTO)
**Master authority:** `.agent/prime.md` (workflow protocol applies)

---

## Critical Rules

1. **Drive file write rule (most common integration bug)** — Every automated service writing to Firebase Storage MUST ALSO write a `drive_files` Firestore doc (`tenants/{orgId}/drive_files/{fileId}`). Without this doc, the file is invisible in the Drive UI. Storage upload alone is insufficient.

2. **`DriveCategory` is `'documents'` (plural)** — NOT `'document'`. Check `src/types/drive.ts`. Wrong category causes file to appear in wrong folder or not at all.

3. **Share uses a token, not a direct URL** — Public shares generate a token stored in Firestore. The share landing page resolves the token to the file. Never expose storage URLs directly in share links.

4. **`name: u.name ?? null` in share operations** — Firestore rejects `undefined` values. Always use `?? null` for optional string fields in share create/update operations.

5. **`updateFileContent()` has ownership check** — Verifies `drive_files/{id}.orgId === user.currentOrgId` before allowing edits. Don't bypass this for cross-org admin operations without explicit auth escalation.

6. **AI Magic Button uses Claude Haiku directly** — NOT Genkit, not Gemini. `callClaude()` with `model: 'claude-haiku-*'`. 7 supported actions: improve, summarize, translate, expand, simplify, extract_data, generate_report.

7. **Auto-save debounce is 3 seconds** — File editor debounces writes. Ctrl+S triggers immediate save. Don't reduce the debounce — it prevents Firestore write storms on fast typists.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/drive/` | BakedBot Drive UI |
| `src/server/actions/drive.ts` | Drive CRUD, getFiles, createFile, updateFileContent, deleteFile |
| `src/server/services/drive-bridge.ts` | Drive-inbox bridge (saves artifacts to Drive) |
| `src/types/drive.ts` | DriveFile, DriveCategory, DriveShare types |
| `src/app/api/drive/share/route.ts` | Public share token resolution |

## Deep Link Pattern
`/dashboard/drive?file=<driveFileId>` → auto-opens file viewer

## Full Architecture → `.agent/engineering-agents/drive-dana/memory/architecture.md`
## Patterns & Gotchas → `.agent/engineering-agents/drive-dana/memory/patterns.md`

---

*Governed by prime.md. Linus reviews cross-domain changes.*
