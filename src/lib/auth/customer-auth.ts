/**
 * Customer Authentication Service
 * Handles customer registration, login, and account management
 */

'use client';

import {
    createUserWithEmailAndPassword,
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
// Get Firebase instances
const { auth, firestore: db } = typeof window !== 'undefined'
    ? initializeFirebase()
    : { auth: null as any, firestore: null as any };

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
            auth,
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

        return userCredential;
    } catch (error: any) {
        logger.error('[CustomerAuth] Registration error:', error);
        throw error;
    }
}

/**
 * Register customer with Google OAuth
 */
export async function registerWithGoogle(): Promise<UserCredential> {
    try {
        const userCredential = await signInWithPopup(auth, googleProvider);

        // Check if profile exists, create if not
        const profileExists = await checkProfileExists(userCredential.user.uid);

        if (!profileExists) {
            await createCustomerProfile(userCredential.user, {
                displayName: userCredential.user.displayName || 'Customer',
                photoURL: userCredential.user.photoURL ?? undefined,
            });
        }

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
        return await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
        logger.error('[CustomerAuth] Login error:', error);
        throw error;
    }
}

/**
 * Login customer with Google
 */
export async function loginWithGoogle(): Promise<UserCredential> {
    try {
        return await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
        logger.error('[CustomerAuth] Google login error:', error);
        throw error;
    }
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
    try {
        await sendPasswordResetEmail(auth, email);
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
        const docRef = doc(db, 'users', uid);
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

        await setDoc(doc(db, 'users', user.uid), profile);
    } catch (error) {
        logger.error('[CustomerAuth] Create profile error:', error instanceof Error ? error : new Error(String(error)));
        throw error;
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
