
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './config';

export async function createServerClient() {
    const apps = getApps();
    const app = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
    
    const auth = getAuth(app);
    // In a server environment, we don't wait for auth state to be ready
    // as it's typically determined by a cookie or header on each request.
    // await auth.authStateReady(); 

    return {auth, app};
}
