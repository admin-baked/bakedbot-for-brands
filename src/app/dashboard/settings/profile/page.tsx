// src/app/dashboard/settings/profile/page.tsx
// Server component — loads OrgProfile (with legacy fallback) and delegates to client

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { getOrgProfileWithFallback } from '@/server/services/org-profile';
import { OrgProfileClient } from './org-profile-client';
import type { OrgProfile } from '@/types/org-profile';

async function getOrgId(userId: string): Promise<string | null> {
  const db = getAdminFirestore();
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return null;
  const data = userDoc.data();
  return data?.orgId || data?.brandId || data?.locationId || null;
}

export default async function OrgProfilePage() {
  const session = await requireUser();
  const orgId = await getOrgId(session.uid);

  let profile: OrgProfile | null = null;
  if (orgId) {
    profile = await getOrgProfileWithFallback(orgId).catch(() => null);
  }

  return (
    <OrgProfileClient
      orgId={orgId ?? ''}
      initialProfile={profile}
    />
  );
}
