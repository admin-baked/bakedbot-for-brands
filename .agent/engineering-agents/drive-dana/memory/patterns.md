# Drive Dana — Patterns & Gotchas

## Critical Rules

### Rule 1: Always write BOTH Storage + Firestore doc
```typescript
// ✅ CORRECT — file visible in Drive UI
const file = storage.bucket('bakedbot-global-assets').file(`reports/${orgId}/report.md`);
await file.save(content, { contentType: 'text/markdown' });

await db.collection(`tenants/${orgId}/drive_files`).add({
  name: 'Competitive Intelligence Report',
  category: 'reports',           // ← 'reports' not 'report'
  storageUrl: `gs://bakedbot-global-assets/reports/${orgId}/report.md`,
  orgId,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
});

// ❌ WRONG — file uploaded but invisible in Drive
const file = storage.bucket('bakedbot-global-assets').file(`reports/${orgId}/report.md`);
await file.save(content);
// Missing Firestore write → file exists in Storage but not in Drive UI
```

### Rule 2: `DriveCategory` is plural ('documents', 'reports')
```typescript
// ✅ CORRECT
category: 'documents'  // plural
category: 'reports'    // plural
category: 'images'     // plural
category: 'exports'    // plural

// ❌ WRONG
category: 'document'   // singular — TypeScript may accept this but Drive UI ignores it
category: 'report'     // singular
```

### Rule 3: Share `name` field uses `?? null`
```typescript
// ✅ CORRECT — Firestore accepts null, not undefined
await db.collection('drive_shares').add({
  orgId,
  driveFileId,
  token: generateToken(),
  name: shareData.name ?? null,        // null if not provided
  permissions: shareData.permissions,
});

// ❌ WRONG — Firestore rejects undefined
await db.collection('drive_shares').add({
  name: shareData.name,  // undefined if not provided → Firestore error
});
```

### Rule 4: AI Magic Button uses callClaude, not Genkit
```typescript
// ✅ CORRECT — Claude Haiku via callClaude()
const result = await callClaude({
  model: 'claude-haiku-20240307',
  systemPrompt: actionPrompts[action],
  userMessage: fileContent,
  maxTokens: 2000,
});

// ❌ WRONG — Gemini may refuse cannabis content, Genkit is overkill
const result = await ai.generate({ model: gemini, prompt: fileContent });
```

### Rule 5: Deep links via `?file=` query param
```typescript
// To open a specific file from anywhere in the app:
router.push(`/dashboard/drive?file=${driveFileId}`);

// Drive page auto-opens FileViewer when ?file= present:
const fileId = searchParams.get('file');
if (fileId) { setActiveFile(fileId); }
```

---

## Common Mistakes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| File uploaded but not visible in Drive | Missing `drive_files` Firestore doc | Always dual-write: Storage + Firestore doc |
| Files show in wrong folder | Wrong `category` field (or singular form) | Use exact: `'documents'` `'images'` `'reports'` `'exports'` |
| Share link 404 | Sharing Storage URL directly | Use token-based share endpoint instead |
| Editor changes not persisting | Debounce auto-save, but Ctrl+S not wired | Ensure both debounce + Ctrl+S handlers are connected |
| "Permission denied" on edit | Cross-org attempt or ownership check failing | Verify `drive_files/{id}.orgId` matches `user.currentOrgId` |
| AI Magic Button crashes on cannabis content | Using Gemini instead of Claude | Use `callClaude()` with Haiku model — cannabis-friendly |

---

## Drive-Inbox Bridge Integration Template

```typescript
// Any agent/service that saves content to Drive should use this pattern:
import { saveToDrive } from '@/server/services/drive-bridge';

const result = await saveToDrive({
  orgId,
  name: 'Research Report: Cannabis Market Analysis',
  content: markdownContent,
  category: 'reports',
  createdBy: userId || 'system',
});

// result.driveFileId can then be attached to inbox artifacts:
const artifact: InboxArtifact = {
  type: 'research_report',
  data: { taskId, reportTitle, driveFileId: result.driveFileId },
};
```

---

*Patterns version: 1.0 | Created: 2026-02-26*
