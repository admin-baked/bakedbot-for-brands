import { getAdminFirestore } from '@/firebase/admin';

export function calculateActiveCustomerCount(totalCount: number, archivedCount: number): number {
  return Math.max(0, totalCount - archivedCount);
}

export async function getActiveCustomerCount(orgId: string): Promise<number> {
  const db = getAdminFirestore();

  const [totalCustomersSnap, archivedCustomersSnap] = await Promise.all([
    db.collection('customers').where('orgId', '==', orgId).count().get(),
    db
      .collection('customers')
      .where('orgId', '==', orgId)
      .where('archived', '==', true)
      .count()
      .get(),
  ]);

  return calculateActiveCustomerCount(
    totalCustomersSnap.data().count,
    archivedCustomersSnap.data().count
  );
}
