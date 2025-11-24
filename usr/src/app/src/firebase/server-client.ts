// src/firebase/server-client.ts
import { getApps, getApp, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App;

// In Firebase Hosting / Studio / Cloud Workstations, initializeApp() with no args
// will use Application Default Credentials (ADC).
// Locally, you can use GOOGLE_APPLICATION_CREDENTIALS or the Firebase CLI emulators.
if (!getApps().length) {
  app = initializeApp();
} else {
  app = getApp();
}

const firestore: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

export function createServerClient() {
  return {
    app,
    firestore,
    auth,
  };
}
