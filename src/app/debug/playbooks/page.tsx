
// app/debug/playbooks/page.tsx
import React from 'react';
import { createServerClient } from '@/firebase/server-client';

export const dynamic = 'force-dynamic'; // avoid static export surprises

type Playbook = {
  id: string;
  [key: string]: unknown;
};

export default async function DebugPlaybooksPage() {
  let playbooks: Playbook[] = [];
  let error: string | null = null;

  try {
    const { firestore } = await createServerClient();

    // Using Admin SDK style API (firestore.collection(...).get())
    const snapshot = await firestore.collection('playbooks').get();

    playbooks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Playbook[];
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <h1 className="text-2xl font-semibold mb-4">Debug: Playbooks</h1>

      {error ? (
        <div className="rounded-lg border border-red-500/60 bg-red-500/10 p-4 text-red-200">
          <p className="font-mono text-sm">Error loading playbooks:</p>
          <p className="mt-1 font-mono text-xs break-words">{error}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
          <p className="text-sm text-slate-300 mb-2">
            Fetched <span className="font-mono">{playbooks.length}</span>{' '}
            playbook(s) from Firestore:
          </p>
          <pre className="mt-2 max-h-[60vh] overflow-auto rounded bg-black/60 p-3 text-xs font-mono">
            {JSON.stringify(playbooks, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}
