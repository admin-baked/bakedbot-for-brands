// src/lib/dev-personas.ts
export type DevPersonaKey = 'brand' | 'dispensary' | 'customer' | 'onboarding';

// Note: The UID is a hard-coded, non-sensitive identifier for development purposes.
// It allows us to consistently target the same user record in Firebase Auth.
export type DevPersona = {
  uid: string;
  email: string;
  displayName: string;
  role: 'brand' | 'dispensary' | 'customer' | null;
  brandId: string | null;
  locationId: string | null;
};


export const devPersonas: Record<DevPersonaKey, DevPersona> = {
    brand: {
        uid: 'dev-brand-user',
        email: 'brand@bakedbot.ai',
        displayName: 'Brand Manager',
        role: 'brand',
        brandId: 'default',
        locationId: null
    },
    dispensary: {
        uid: 'dev-dispensary-user',
        email: 'dispensary@bakedbot.ai',
        displayName: 'Dispensary Manager',
        role: 'dispensary',
        brandId: null,
        locationId: '1', // The Green Spot
    },
    customer: {
        uid: 'dev-customer-user',
        email: 'customer@bakedbot.ai',
        displayName: 'Demo Customer',
        role: 'customer',
        brandId: null,
        locationId: null,
    },
    onboarding: {
        uid: 'dev-onboarding-user',
        email: 'onboarding@bakedbot.ai',
        displayName: 'New User',
        role: null, // No role assigned yet
        brandId: null,
        locationId: null,
    }
};

// This is safe to use on the client (no secrets here).
export const DEV_PERSONA_OPTIONS = Object.entries(devPersonas).map(
  ([key, persona]) => ({
    key: key as DevPersonaKey,
    label: persona.displayName,
    email: persona.email,
    role: persona.role,
  })
);
