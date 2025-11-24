// app/debug/playbooks/page.tsx
import React from 'react';
import { createServerClient } from '@/firebase/server-client';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Debug: Playbooks',
};

export default async function DebugPlaybooksPage() {
  let status: 'ok' | 'error' = 'ok';
  let details: unknown = null;

  try {
    const { firestore } = await createServerClient();

    // Using Admin SDK style API (firestore.collection(...).get())
    const snapshot = await firestore.collection('playbooks').get();

    const playbooks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    details = { count: playbooks.length, items: playbooks };
  } catch (err) {
    status = 'error';
    const error = err instanceof Error ? err : new Error(String(err));
    details = {
      message: error.message,
      isServiceAccountError: error.message.includes('FIREBASE_SERVICE_ACCOUNT_KEY'),
      stack: error.stack,
    };
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <h1 className="text-2xl font-semibold mb-4">Debug: Playbooks</h1>

      {status === 'error' ? (
        <div className="rounded-lg border border-red-500/60 bg-red-500/10 p-4 text-red-200">
          <p className="font-mono text-sm">Error loading playbooks:</p>
          <pre className="mt-2 max-h-[60vh] overflow-auto rounded bg-black/60 p-3 text-xs font-mono">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-sm text-slate-300 mb-2">
            Successfully connected to Firestore and fetched{' '}
            <span className="font-mono">{(details as any)?.count ?? 0}</span>{' '}
            playbook(s):
          </p>
          <pre className="mt-2 max-h-[60vh] overflow-auto rounded bg-black/60 p-3 text-xs font-mono">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
