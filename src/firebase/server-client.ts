
// src/firebase/server-client.ts
import {
  getApps,
  getApp,
  initializeApp,
  App,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App;

if (!getApps().length) {
  // In Firebase Studio / Hosting / Cloud env, this will use ADC.
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
