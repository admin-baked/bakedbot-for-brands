import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { GoalsClient } from './goals-client';
import type { OrgGoal } from '@/types/goals';

export default async function GoalsPage() {
  const session = await requireUser();
  const db = getAdminFirestore();

  // Get user's org
  const userDoc = await db.collection('users').doc(session.uid).get();
  const userData = userDoc.data();
  const orgId = userData?.currentOrgId || userData?.orgIds?.[0];

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Organization not found</p>
      </div>
    );
  }

  // Fetch goals
  const goalsSnapshot = await db
    .collection('orgs')
    .doc(orgId)
    .collection('goals')
    .orderBy('endDate', 'desc')
    .get();

  const goals = goalsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
      lastProgressUpdatedAt: data.lastProgressUpdatedAt?.toDate?.() || new Date(),
      startDate: data.startDate?.toDate?.() || new Date(),
      endDate: data.endDate?.toDate?.() || new Date(),
    } as OrgGoal;
  });

  return <GoalsClient orgId={orgId} initialGoals={goals} />;
}
