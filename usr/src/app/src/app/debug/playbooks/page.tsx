import { Metadata } from 'next';
import { createServerClient } from '@/firebase/server-client';

export const metadata: Metadata = {
  title: 'Debug: Playbooks',
};

export default async function DebugPlaybooksPage() {
  let status: 'ok' | 'error' = 'ok';
  let details: unknown = null;

  try {
    const { firestore } = await createServerClient();
    const snap = await firestore.collection('playbooks').limit(5).get();
    const items = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    details = { count: items.length, items };
  } catch (err: any) {
    status = 'error';
    details = {
      message: err?.message ?? String(err),
      stack: err?.stack,
    };
  }

  return (
    <main className="mx-auto max-w-2xl p-8 space-y-4">
      <h1 className="text-2xl font-bold">Debug: Playbooks</h1>
      <p className="text-sm text-gray-500">
        This page verifies FIREBASE_SERVICE_ACCOUNT_KEY and Firestore connectivity.
      </p>

      <pre className="rounded bg-black text-green-200 text-xs p-4 overflow-x-auto whitespace-pre-wrap">
        {JSON.stringify({ status, details }, null, 2)}
      </pre>
    </main>
  );
}
