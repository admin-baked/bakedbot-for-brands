'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

// Initialize Firebase with a fail-safe for CI/test environments where public key may be missing.
let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

try {
  const hasApiKey = typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.trim().length > 0;
  if (hasApiKey) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } else {
    console.warn('[firebase/client] NEXT_PUBLIC_FIREBASE_API_KEY not set; Firebase client SDK disabled.');
  }
} catch (error) {
  console.warn('[firebase/client] Firebase client init failed; continuing without SDK.', error);
}

export { app, auth, db, storage };
