// src/app/dashboard/settings/intent-profile/page.tsx
// Server component — fetches intent profile and delegates to client

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { getIntentProfile } from '@/server/services/intent-profile';
import { IntentProfileClient } from './intent-profile-client';
import type { DispensaryIntentProfile } from '@/types/dispensary-intent-profile';

async function getOrgId(userId: string): Promise<string | null> {
  const db = getAdminFirestore();
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return null;
  const data = userDoc.data();
  return data?.orgId || data?.brandId || data?.locationId || null;
}

export default async function IntentProfilePage() {
  const session = await requireUser();
  const orgId = await getOrgId(session.uid);

  let profile: DispensaryIntentProfile | null = null;
  if (orgId) {
    profile = await getIntentProfile(orgId).catch(() => null);
  }

  return (
    <IntentProfileClient
      orgId={orgId ?? ''}
      initialProfile={profile}
    />
  );
}
