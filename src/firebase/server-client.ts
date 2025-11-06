
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

export async function createServerClient() {
    const apps = getApps();
    const app = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
    
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    // In a server environment, we don't wait for auth state to be ready
    // as it's typically determined by a cookie or header on each request.
    
    return {auth, app, firestore};
}
