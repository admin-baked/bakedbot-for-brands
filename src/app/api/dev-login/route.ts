import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import type { Brand, Retailer } from '@/types/domain';

// Define the shape of our persona configurations
interface Persona {
  uid: string;
  email: string;
  displayName: string;
  customClaims: {
    role: 'brand' | 'dispensary' | 'customer' | 'owner';
    brandId?: string;
    locationId?: string;
  };
  firestoreProfile: {
    email: string;
    displayName: string;
    role: 'brand' | 'dispensary' | 'customer' | 'owner';
    brandId?: string;
    locationId?: string;
  };
}

// Hard-coded persona configurations. In a real app, this might come from a config file.
const personas: Record<string, Persona> = {
  'brand-manager': {
    uid: 'dev-brand-manager',
    email: 'brand@bakedbot.ai',
    displayName: 'Brand Manager',
    customClaims: { role: 'brand', brandId: 'bakedbot-brand-id' },
    firestoreProfile: {
      email: 'brand@bakedbot.ai',
      displayName: 'Brand Manager',
      role: 'brand',
      brandId: 'bakedbot-brand-id',
    },
  },
  'dispensary-manager': {
    uid: 'dev-dispensary-manager',
    email: 'dispensary@bakedbot.ai',
    displayName: 'Dispensary Manager',
    customClaims: { role: 'dispensary', locationId: '1' }, // Default to location '1'
    firestoreProfile: {
      email: 'dispensary@bakedbot.ai',
      displayName: 'Dispensary Manager',
      role: 'dispensary',
      locationId: '1',
    },
  },
  'customer': {
    uid: 'dev-customer',
    email: 'customer@bakedbot.ai',
    displayName: 'Demo Customer',
    customClaims: { role: 'customer' },
    firestoreProfile: {
      email: 'customer@bakedbot.ai',
      displayName: 'Demo Customer',
      role: 'customer',
      favoriteLocationId: '2', // Give them a favorite location
    },
  },
  'onboarding-user': {
      uid: 'dev-onboarding-user',
      email: 'onboarding@bakedbot.ai',
      displayName: 'New User',
      customClaims: {}, // No claims initially
      firestoreProfile: {
          email: 'onboarding@bakedbot.ai',
          displayName: 'New User',
          role: 'customer', // Default role before onboarding completes
      }
  }
};


export async function POST(req: NextRequest) {
  // Guard clause: This API route should only be available in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'This endpoint is not available in production.' }, { status: 404 });
  }

  try {
    const { persona: personaId } = await req.json();
    const persona = personas[personaId];

    if (!persona) {
      return NextResponse.json({ error: 'Invalid persona specified.' }, { status: 400 });
    }

    const { auth, firestore } = await createServerClient();

    // 1. Ensure user exists in Firebase Auth & set custom claims
    try {
        await auth.updateUser(persona.uid, { email: persona.email, displayName: persona.displayName });
        await auth.setCustomUserClaims(persona.uid, persona.customClaims);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            await auth.createUser({ uid: persona.uid, email: persona.email, displayName: persona.displayName });
            await auth.setCustomUserClaims(persona.uid, persona.customClaims);
        } else {
            throw error; // Re-throw other errors
        }
    }

    // 2. Ensure user profile exists in Firestore
    const userDocRef = firestore.collection('users').doc(persona.uid);
    await userDocRef.set(persona.firestoreProfile, { merge: true });
    
    // 3. Create a custom token for the client to sign in with
    const customToken = await auth.createCustomToken(persona.uid);

    return NextResponse.json({ token: customToken });

  } catch (error: any) {
    console.error('DEV LOGIN FAILED:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred.' }, { status: 500 });
  }
}
