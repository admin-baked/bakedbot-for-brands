# Drive Dana — Architecture

## Overview

Drive Dana owns BakedBot Drive — a Google Drive-inspired file management system built on Firebase Storage + Firestore. The most common integration bug across all of BakedBot: automated services uploading to Storage without writing the companion Firestore doc.

---

## 1. Drive File Write Rule (THE Most Important Pattern)

```
EVERY automated service that writes to Firebase Storage MUST also write
a drive_files Firestore doc. Without the Firestore doc, the file is
invisible in the Drive UI.

Required write sequence:
  1. Upload to Firebase Storage:
     bucket: 'bakedbot-global-assets'
     path:   '{category}/{orgId}/{filename}'

  2. Write Firestore doc:
     collection: tenants/{orgId}/drive_files/{id}
     fields:
       name: string
       category: DriveCategory    ← 'documents' | 'images' | 'reports' | 'exports'
       storageUrl: string         ← 'gs://bakedbot-global-assets/...'
       publicUrl?: string         ← https://storage.googleapis.com/... if public
       mimeType?: string
       size?: number
       orgId: string
       createdBy?: string         ← userId or 'system'
       createdAt: Timestamp
       updatedAt: Timestamp
```

---

## 2. DriveCategory Type

```typescript
// src/types/drive.ts
type DriveCategory = 'documents' | 'images' | 'reports' | 'exports';

// ⚠️ Always 'documents' (plural) — never 'document' (singular)
// Common mistake:
category: 'document'   // ❌ WRONG — TypeScript accepts string, runtime silently wrong
category: 'documents'  // ✅ CORRECT
```

---

## 3. File Viewer / Editor

```
File viewer supports:
  markdown  → rendered with react-markdown (syntax highlighting)
  json      → formatted with JSON.stringify(data, null, 2)
  text      → plain <pre> block
  image     → <img> tag with storage URL
  pdf       → <iframe> embed

File editor:
  - textarea with 3-second debounce auto-save
  - Ctrl+S triggers immediate save
  - markdown preview toggle (split-pane editor/preview)
  - Saves via updateFileContent(driveFileId, newContent)

updateFileContent() ownership check:
  → Verifies drive_files/{id}.orgId === user.currentOrgId
  → Throws 403 if different org tries to edit
  → Cannot bypass for cross-org admin operations without explicit auth escalation
```

---

## 4. AI Magic Button (7 Actions)

```
Uses Claude Haiku (NOT Genkit, NOT Gemini):
  callClaude({
    model: 'claude-haiku-...',
    systemPrompt: actionSystemPrompt,
    userMessage: fileContent,
  })

7 supported actions:
  improve         → rewrite for clarity and flow
  summarize       → executive summary (3-5 bullets)
  translate       → detect language → translate to English (or specified language)
  expand          → add more detail and examples
  simplify        → plain language, shorter sentences
  extract_data    → JSON extraction of key entities/facts
  generate_report → structured report with sections/headers

For improve/summarize/translate results:
  → "Apply to Editor" button replaces file content
For expand/simplify:
  → "Apply to Editor" replaces file content
For extract_data/generate_report:
  → Shown as modal (user can copy or save as new file)

Ask textarea:
  → User can type a custom instruction alongside any action
  → Prepended to the action system prompt
```

---

## 5. Drive-Inbox Bridge

```
src/server/services/drive-bridge.ts

saveArtifactToDrive(orgId, artifact):
  → Converts inbox artifact to markdown
  → Uploads to Storage
  → Writes drive_files doc
  → Returns driveFileId

Used by:
  → Research reports (Big Worm saves to Drive after synthesis)
  → CI weekly reports (Ezal saves to Drive)
  → Meeting notes (Felisha transcript + Claude notes)
  → Creative content (generated images + captions)

Inbox rendering:
  InboxArtifact.driveFileId? → shows "Saved to Drive" badge + "Open in Drive" button
  Deep link: /dashboard/drive?file={driveFileId}
```

---

## 6. Share System

```
Drive shares are token-based (not direct Storage URLs):

createShare(orgId, driveFileId, { permissions, name? }):
  → Creates drive_shares/{id} doc with token
  → token: uuid v4 (never guessable)
  → permissions: 'view' | 'download' | 'comment'
  → expiresAt?: Timestamp (optional expiration)

Public share URL: /api/drive/share/{token}
  → Resolves token → drive_shares doc → drive_files doc → Storage download URL
  → Never exposes Storage URL directly in the share link

IMPORTANT: name field requires ?? null, not ?? undefined:
  name: shareData.name ?? null  // ✅ Firestore accepts null
  name: shareData.name          // ❌ Firestore rejects undefined
```

---

## 7. Firebase Storage Layout

```
Bucket: bakedbot-global-assets

Directory structure:
  products/{orgId}/{docId}.jpg        ← Product images (from POS sync)
  brand-images/{orgId}/hero.jpg       ← Brand Kit images (from Creative Larry)
  brand-images/{orgId}/product_bg.jpg
  brand-images/{orgId}/ambient.jpg
  brand-images/{orgId}/texture.jpg
  themes/{orgId}/{themeId}/           ← WordPress theme ZIPs + CSS
  reports/{orgId}/ci-{week}.md        ← CI weekly reports
  research/{orgId}/{taskId}.md        ← Big Worm research reports
  drive/{orgId}/{fileId}              ← User-uploaded Drive files

Public URL format:
  https://storage.googleapis.com/bakedbot-global-assets/{path}
```

---

*Architecture version: 1.0 | Created: 2026-02-26*
