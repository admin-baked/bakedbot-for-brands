
import { initializeServerApp } from 'firebase/app';
import { getAuth } from 'firebase/auth/fancy-server';
import { firebaseConfig } from './config';

export async function createServerClient() {
    const { initializeApp } = await import('firebase/app');

    const { getApps, getApp } = await import('firebase/app');

    const apps = getApps();

    const app = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
    
    const auth = getAuth(app);
    await auth.authStateReady();

    return {auth, app};
}
