
// app/debug/playbooks/page.tsx

import { listPlaybooksForBrand, Playbook } from '@/server/repos/playbookRepo';

async function getPlaybookData() {
    try {
        // Fetching for a hard-coded brandId for debugging purposes.
        const brandId = 'demo-brand';
        const playbooks = await listPlaybooksForBrand(brandId);
        return { playbooks, error: null };
    } catch (error) {
        console.error("Error fetching playbooks for debug page:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return { playbooks: [], error: errorMessage };
    }
}


export default async function DebugPlaybooksPage() {
  const { playbooks, error } = await getPlaybookData();

  return (
    <main className="min-h-screen w-full bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
            <h1 className="text-2xl font-bold">Playbook Debug View</h1>
            <p className="text-sm text-muted-foreground">
                This page fetches and displays playbook data directly from Firestore for debugging.
            </p>
        </header>

        {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-bold">An error occurred:</p>
                <p>{error}</p>
            </div>
        )}

        <div className="space-y-4">
          {playbooks.map(pb => (
            <div key={pb.id} className="rounded-lg border bg-card p-4">
              <pre className="text-xs">{JSON.stringify(pb, null, 2)}</pre>
            </div>
          ))}
          {playbooks.length === 0 && !error && (
            <div className="text-center py-10 border border-dashed rounded-lg">
                <p>No playbooks found for brand 'demo-brand'.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
