# Production Spec: Drive System

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agent(s):** Linus (CTO), Craig (Marketer), All agents (writes to Drive)
**Tier:** 3 — Supporting Systems

---

## 1. Feature Overview

BakedBot Drive is the internal file storage and management system for brand assets, AI-generated content, competitive intelligence reports, and agent artifacts. It provides Google Drive-style folder hierarchies with 4 system folders (agents, qr, images, documents), file sharing with access controls (public/link-only/email-gated/users-only/private), inline file viewing/editing (markdown/JSON/text/images/PDFs), AI processing (summarize, improve, key points, Q&A), and Inbox integration (agents save artifacts to Drive with driveFileId linkage). All files stored in Firebase Storage (`bakedbot-global-assets` bucket), metadata tracked in Firestore `drive_files` collection.

---

## 2. Current State

### Shipped ✅
- **Folder system**: 4 system folders auto-initialized (agents/qr/images/documents), custom folder creation, nested folder support with depth tracking (`src/server/actions/drive.ts:57-118,123-176`)
- **File uploads**: Form upload (local files), URL upload (remote files), automatic metadata extraction (size, mimeType, storagePath, downloadUrl) (`drive.ts:290-379,384-464`)
- **File operations**: Rename, move, soft delete, restore, permanent delete, duplicate, trash view, empty trash (`drive.ts:564-603,608-685,690-730,735-770,775-818,823-882,1224-1286`)
- **File viewer**: Sheet-based viewer with inline preview for markdown/JSON/text/images/PDFs, download button, metadata display (`src/components/drive/file-viewer.tsx`)
- **File editor**: Textarea editing with 3s auto-save debounce, Ctrl+S manual save, markdown preview toggle, ownership-gated writes (`file-viewer.tsx:200-300`, `src/server/actions/drive-content.ts:24-88`)
- **AI Magic Button**: 7 AI actions (summarize, improve, key_points, ask, follow_up, parse_json, describe_image) via Claude Haiku, "Ask" mode with user question input, "Apply" to editor for improve/summarize results (`drive-content.ts:94-166`, `file-viewer.tsx:400-600`)
- **Sharing system**: Create shares with token generation, access control levels (public/link-only/email-gated/users-only/private), access levels (view/download/edit), password protection with bcrypt hashing, expiry dates, max download limits, user allowlists, share revocation, share URL generation (`drive.ts:891-1162`)
- **Storage stats**: Total size, file count, folder count, by-category breakdown, recent files (`drive.ts:1171-1220`)
- **Search**: Filename, description, and tag filtering (client-side filter after Firestore fetch) (`drive.ts:494-531`)
- **Breadcrumbs**: Folder path navigation with parent traversal (`drive.ts:231-241`)
- **Deep linking**: `?file=<driveFileId>` on `/dashboard/drive` auto-opens viewer
- **Inbox integration**: `InboxArtifact.driveFileId` field, "Saved to Drive" badge, "Open in Drive" button, `inbox-drive-bridge.ts` service (`memory/MEMORY.md:90`)
- **Automated Drive writes**: Regulation monitor (compliance proposals), Creative Studio (generated images), Ezal (competitive reports), all follow Drive save pattern (Storage upload + Firestore doc) (`memory/MEMORY.md:9`)

### Partially Working ⚠️
- **Search**: Firestore doesn't support full-text search — current implementation fetches ALL files for user then filters client-side (breaks with 1000+ files)
- **Folder aggregates**: `fileCount` and `totalSize` updated on upload/delete but NOT on file content edits (stale aggregates after `updateFileContent`)
- **Share access logs**: `DriveShare.accessLog` field exists but NO endpoint records access events (viewCount/downloadCount never incremented)
- **AI file processing**: Works for text-based files but `describe_image` action not tested/validated (image → Claude vision API path unclear)
- **Password-protected shares**: Password hash stored but NO public share access page validates password (shares with passwords are inaccessible)
- **Expiry enforcement**: `DriveShare.expiresAt` stored but NO cron job auto-revokes expired shares
- **System folder icons**: `DRIVE_CATEGORIES[category].icon` defined but not rendered in folder tree UI

### Not Implemented ❌
- **Versioning**: No file version history (edits overwrite, no rollback)
- **Collaborative editing**: No real-time multi-user editing (last-write-wins race condition)
- **File preview thumbnails**: No thumbnail generation for images/PDFs (grid view shows generic icons)
- **Batch operations**: No multi-select + bulk delete/move/share
- **Storage quotas**: No per-org limits (unlimited uploads until Firebase quota hit)
- **Trash auto-cleanup**: Deleted files never auto-purged (trash grows unbounded)
- **Share analytics**: No dashboard showing share performance (views, downloads, top sharers)
- **Public share landing page**: No `/api/drive/share/:token` route (shares created but inaccessible)
- **Webhook notifications**: No alerts when files shared, accessed, or edited

---

## 3. Acceptance Criteria

### Functional
- [ ] User can create folders (custom + system auto-initialized) and see folder tree with depth hierarchy
- [ ] User can upload files (local + URL) and files appear in correct folder with accurate metadata (size, mimeType, downloadUrl)
- [ ] User can view files inline (markdown/JSON/text/images/PDFs render correctly in viewer)
- [ ] User can edit text-based files (markdown/JSON/text) and save with 3s auto-save + Ctrl+S manual save
- [ ] User can run AI processing (summarize, improve, key_points, ask) and see results in AI panel
- [ ] User can create shares with access control (link-only, users-only, email-gated) and receive shareable URL
- [ ] User can revoke shares and share no longer grants access
- [ ] User can soft delete files/folders and restore from trash
- [ ] User can permanently delete from trash (Storage file deleted, Firestore doc deleted)
- [ ] User can search files by name/description/tags and see matching results
- [ ] Inbox artifacts with `driveFileId` show "Open in Drive" button that deep-links to viewer
- [ ] Deep link `?file=<driveFileId>` auto-opens file viewer sheet

### Compliance / Security
- [ ] Only file owner can edit file content (ownership check in `updateFileContent`)
- [ ] Only file owner can delete, rename, move files (ownership checks in all mutation actions)
- [ ] Only share creator can revoke share (ownership check in `revokeShare`)
- [ ] Password-protected shares hash password with bcrypt (never store plaintext)
- [ ] Shared files DO NOT expose owner's other files (share token scoped to target file/folder only)
- [ ] Public shares with `accessLevel: 'view'` DO NOT allow downloads (enforced at public route)
- [ ] System folders (agents, qr, images, documents) CANNOT be deleted by users

### Performance
- [ ] File uploads complete in < 5s for files < 5MB
- [ ] Folder contents load in < 1s for folders with < 100 files
- [ ] File viewer opens in < 500ms for text files < 1MB
- [ ] Search returns results in < 2s for users with < 500 files
- [ ] AI processing completes in < 10s for documents < 40k chars

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| No public share access page | 🔴 Critical | Shares created but inaccessible — `/api/drive/share/:token` route missing |
| No file versioning | 🔴 Critical | Edits overwrite content — no rollback after accidental deletion/edit |
| Search breaks with 1000+ files | 🟡 High | Client-side filter after full fetch — needs Firestore full-text index or Algolia |
| No storage quotas | 🟡 High | Unlimited uploads until Firebase quota hit — no per-org limits or warnings |
| Expired shares not auto-revoked | 🟡 High | `expiresAt` stored but no cron job checks/revokes expired shares |
| Share access logs never written | 🟡 High | `viewCount`/`downloadCount` fields exist but never incremented |
| Password-protected shares inaccessible | 🟡 High | Password hash stored but no validation endpoint |
| No batch operations | 🟡 High | Multi-select + bulk delete/move needed for power users |
| Folder aggregates stale after edits | 🟡 High | `fileCount`/`totalSize` updated on upload/delete but not on content edits |
| No trash auto-cleanup | 🟢 Low | Deleted files never purged — trash grows unbounded |
| No preview thumbnails | 🟢 Low | Image/PDF grid view shows generic icons instead of thumbnails |
| No collaborative editing | 🟢 Low | Last-write-wins race condition if 2 users edit same file |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| Drive types | `src/server/actions/__tests__/drive.test.ts` | Validates `DriveFile`, `DriveFolder`, `DriveShare` types, `sanitizeFilename`, `formatFileSize`, `generateStoragePath` |

### Missing Tests (Required for Production-Ready)
- [ ] `drive-upload.integration.test.ts` — validates file upload (local + URL), Storage write, Firestore doc creation
- [ ] `drive-folder-operations.integration.test.ts` — validates folder create, rename, move, soft delete, restore, permanent delete
- [ ] `drive-file-edit.integration.test.ts` — validates `updateFileContent` overwrites Storage file, updates Firestore metadata
- [ ] `drive-ai-processing.integration.test.ts` — validates all 7 AI actions (summarize, improve, key_points, ask, follow_up, parse_json, describe_image)
- [ ] `drive-sharing.integration.test.ts` — validates share create, password hash, token generation, share revoke, access control enforcement
- [ ] `drive-search.unit.test.ts` — validates search filters by name/description/tags
- [ ] `drive-trash.integration.test.ts` — validates soft delete, restore, permanent delete (Storage + Firestore cleanup)
- [ ] `drive-deep-link.e2e.test.ts` — validates `?file=<driveFileId>` auto-opens viewer

### Golden Set Eval
Not applicable (Drive is not agent-driven — it's a user-facing storage system).

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| Firebase Storage | Stores all file content | Drive completely unavailable (uploads fail, downloads 404) |
| Firestore | Stores file metadata (`drive_files`, `drive_folders`, `drive_shares`) | Drive UI loads empty (no files/folders visible) |
| requireUser | Auth gate for all Drive actions | Public access to all files (CRITICAL security failure) |
| Inbox | Links artifacts to Drive files via `driveFileId` | Inbox artifacts don't link to Drive (minor UX degradation) |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| Claude Haiku | AI file processing (summarize, improve, ask) | None — AI Magic Button shows error, file editing still works |
| Firebase Storage signed URLs | Download links for shared files | None — shares inaccessible if signed URL generation fails |

---

## 7. Degraded Mode

- **If Firebase Storage is down:** Drive UI shows "Storage service unavailable" error. NO uploads, NO downloads. Read metadata from Firestore only (show file list with names/sizes but no download buttons).
- **If Firestore is down:** Drive completely unavailable — cannot list files, cannot upload (metadata write would fail). Show "Drive temporarily unavailable" error page.
- **If Claude Haiku API times out:** AI Magic Button shows "AI processing failed, try again" error. File viewing/editing unaffected.
- **If file owner deleted:** Orphaned files remain in Storage but invisible in UI (ownership check filters them out). Background job should reassign to org admin or soft-delete.
- **Data loss risk:** If `updateFileContent` writes to Storage but Firestore update fails, file content updated but `size`/`updatedAt` stale. Mitigation: transaction wrapper or retry logic.

---

## 8. Open Questions

1. **Public share access page**: Should shares open in full Drive UI (requires login) or standalone viewer page (no auth)?
2. **Storage quotas**: What limits per org? Empire tier = 50GB? Pro tier = 10GB? How to enforce?
3. **File versioning**: Should we track versions automatically (on every save) or user-triggered (manual snapshots)?
4. **Search architecture**: Firestore full-text index (limited, no fuzzy search) or integrate Algolia ($$, faster)?
5. **Trash auto-cleanup**: Auto-purge after 30 days? Or keep trash indefinitely until manual empty?
6. **Share analytics**: Do we need a "Drive Analytics" dashboard showing top shared files, share performance, access logs?
7. **Thumbnail generation**: Should we generate thumbnails on upload (Cloud Functions) or on-demand (lazy-load)?
8. **Collaborative editing**: Do we need real-time editing (Socket.io, Yjs) or is last-write-wins acceptable?

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on codebase audit |
