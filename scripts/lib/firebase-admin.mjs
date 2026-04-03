/**
 * scripts/lib/firebase-admin.mjs — Shared Firebase Admin init for worker scripts
 *
 * Canonical pattern from desktop-test-loop.mjs:
 *   - Accepts base64-encoded OR raw JSON service account key
 *   - Falls back to applicationDefault() for CI environments
 *   - Sets ignoreUndefinedProperties: true (matches admin.ts)
 *   - Guards against double-init (getApps() check)
 */

import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let _db = null;

export function getDb() {
  if (_db) return _db;

  if (!getApps().length) {
    const keyEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (keyEnv) {
      // Accept base64-encoded or raw JSON
      const raw = keyEnv.startsWith('{') ? keyEnv : Buffer.from(keyEnv, 'base64').toString('utf8');
      initializeApp({ credential: cert(JSON.parse(raw)) });
    } else {
      initializeApp({ credential: applicationDefault() });
    }
  }

  _db = getFirestore();
  _db.settings({ ignoreUndefinedProperties: true });
  return _db;
}
