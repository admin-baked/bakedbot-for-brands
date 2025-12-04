/**
 * Customer Authentication Service
 * Handles customer registration, login, and account management
 */

'use client';

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    sendEmailVerification,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    User,
    UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

import { logger } from '@/lib/logger';

// Firebase instances - initialized lazily
let _auth: any = null;
let _db: any = null;

// Helper to get properly initialized auth
function getAuthInstance() {
    if (typeof window === 'undefined') {
        throw new Error('Auth can only be used on the client');
    }
    if (!_auth) {
        const { auth, firestore } = initializeFirebase();
        _auth = auth;
        _db = firestore;
    }
    return _auth;
}

// Helper to get properly initialized firestore
function getDbInstance() {
    if (typeof window === 'undefined') {
        throw new Error('Firestore can only be used on the client');
    }
    if (!_db) {
        const { auth, firestore } = initializeFirebase();
        _auth = auth;
        _db = firestore;
    }
    return _db;
}

const googleProvider = new GoogleAuthProvider();

export interface CustomerRegistrationData {
    email: string;
    password: string;
    displayName: string;
    phone?: string;
}

export interface CustomerProfile {
    uid: string;
    email: string;
    displayName: string;
    phone?: string;
    role: 'customer';
    emailVerified: boolean;
    createdAt: any;
    updatedAt: any;
    photoURL?: string;
    addresses: Address[];
    preferences: CustomerPreferences;
}

export interface Address {
    id: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    isDefault: boolean;
    label?: string;
}

export interface CustomerPreferences {
    notifications: {
        email: boolean;
        sms: boolean;
        push: boolean;
    };
    language: string;
    theme: 'light' | 'dark' | 'system';
}

/**
 * Register customer with email and password
 */
export async function registerWithEmail(data: CustomerRegistrationData): Promise<UserCredential> {
    try {
        // Check if email already exists
        const emailExists = await checkEmailExists(data.email);
        if (emailExists) {
            throw new Error('Email already in use');
        }

        // Create auth account
        const userCredential = await createUserWithEmailAndPassword(
            getAuthInstance(),
            data.email,
            data.password
        );

        // Create customer profile in Firestore
        await createCustomerProfile(userCredential.user, {
            displayName: data.displayName,
            phone: data.phone,
        });

        // Send verification email
        await sendEmailVerification(userCredential.user);

        // Establish secure session cookie for server actions
        await createServerSession(userCredential.user);

        return userCredential;
    } catch (error: any) {
        logger.error('[CustomerAuth] Registration error:', error);
        throw error;
    }
}

/**
 * Register customer with Google OAuth (redirect-based)
 */
export async function registerWithGoogle(): Promise<UserCredential> {
    try {
        const userCredential = await signInWithPopup(getAuthInstance(), googleProvider);

        // Check if profile exists, create if not
        const profileExists = await checkProfileExists(userCredential.user.uid);

        if (!profileExists) {
            await createCustomerProfile(userCredential.user, {
                displayName: userCredential.user.displayName || 'Customer',
                photoURL: userCredential.user.photoURL ?? undefined,
            });
        }

        // Ensure the server session is created for the new OAuth user
        await createServerSession(userCredential.user);

        return userCredential;
    } catch (error: any) {
        logger.error('[CustomerAuth] Google registration error:', error);
        throw error;
    }
}

/**
 * Login customer with email and password
 */
export async function loginWithEmail(email: string, password: string): Promise<UserCredential> {
    try {
        const credential = await signInWithEmailAndPassword(getAuthInstance(), email, password);
        await createServerSession(credential.user);
        return credential;
    } catch (error: any) {
        logger.error('[CustomerAuth] Login error:', error);
        throw error;
    }
}

/**
 * Login customer with Google (redirect-based)
 */
export async function loginWithGoogle(): Promise<UserCredential> {
    try {
        console.error('[CustomerAuth] Starting Google login popup...');
        const authInstance = getAuthInstance();
        console.error('[CustomerAuth] Auth instance obtained:', !!authInstance);

        const credential = await signInWithPopup(authInstance, googleProvider);
        console.error('[CustomerAuth] signInWithPopup success');

        await createServerSession(credential.user);
        return credential;
    } catch (error: any) {
        logger.error('[CustomerAuth] Google login error:', error);
        console.error('[CustomerAuth] Google login detailed error:', error);
        throw error;
    }
}



/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
    try {
        await sendPasswordResetEmail(getAuthInstance(), email);
    } catch (error: any) {
        logger.error('[CustomerAuth] Password reset error:', error);
        throw error;
    }
}

/**
 * Resend email verification
 */
export async function resendVerificationEmail(user: User): Promise<void> {
    try {
        await sendEmailVerification(user);
    } catch (error: any) {
        logger.error('[CustomerAuth] Verification email error:', error);
        throw error;
    }
}

/**
 * Check if email exists
 */
async function checkEmailExists(email: string): Promise<boolean> {
    // Firebase doesn't have a direct way to check this without trying to create the account
    // This is a placeholder - in production, you'd use Firebase Admin SDK
    return false;
}

/**
 * Check if customer profile exists
 */
async function checkProfileExists(uid: string): Promise<boolean> {
    try {
        const docRef = doc(getDbInstance(), 'users', uid);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
    } catch (error) {
        logger.error('[CustomerAuth] Check profile error:', error instanceof Error ? error : new Error(String(error)));
        return false;
    }
}

/**
 * Create customer profile in Firestore
 */
async function createCustomerProfile(
    user: User,
    additionalData: {
        displayName: string;
        phone?: string;
        photoURL?: string;
    }
): Promise<void> {
    try {
        const profile: CustomerProfile = {
            uid: user.uid,
            email: user.email!,
            displayName: additionalData.displayName,
            phone: additionalData.phone,
            photoURL: additionalData.photoURL || user.photoURL || undefined,
            role: 'customer',
            emailVerified: user.emailVerified,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            addresses: [],
            preferences: {
                notifications: {
                    email: true,
                    sms: false,
                    push: true,
                },
                language: 'en',
                theme: 'system',
            },
        };

        await setDoc(doc(getDbInstance(), 'users', user.uid), profile);
    } catch (error) {
        logger.error('[CustomerAuth] Create profile error:', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}

/**
 * Create a secure session cookie by exchanging the Firebase ID token
 * with the /api/auth/session endpoint. This enables server actions and
 * middleware to authenticate the user.
 */
export async function createServerSession(user: User): Promise<void> {
    const idToken = await user.getIdToken();

    const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
        throw new Error('Unable to establish secure session. Please try again.');
    }
}

/**
 * Get authentication error message
 */
export function getAuthErrorMessage(error: any): string {
    const code = error?.code || '';

    switch (code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please login instead.';
        case 'auth/invalid-email':
            return 'Invalid email address format.';
        case 'auth/weak-password':
            return 'Password is too weak. Please use at least 8 characters.';
        case 'auth/user-not-found':
            return 'No account found with this email.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in popup was closed. Please try again.';
        case 'auth/cancelled-popup-request':
            return 'Sign-in was cancelled. Please try again.';
        default:
            return error?.message || 'An error occurred. Please try again.';
    }
}
