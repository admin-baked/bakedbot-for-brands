// src/app/dashboard/page.tsx
import { createServerClient } from "@/firebase/server-client";

type Playbook = {
  id: string;
  name?: string;
  description?: string;
  status?: string;
};

export default async function DashboardPage() {
  const brandId = "demo-brand";

  let playbooks: Playbook[] = [];
  let error: string | null = null;

  try {
    const { firestore } = await createServerClient();

    const snap = await firestore
      .collection("playbooks")
      .where("brandId", "==", brandId)
      .get();

    playbooks = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as any),
    }));
  } catch (err) {
    console.error("Error loading playbooks for dashboard", err);
    error = "Error loading playbooks. Check Firestore / service account config.";
  }

  const hasPlaybooks = playbooks && playbooks.length > 0;

  return (
    <main className="min-h-screen w-full bg-background">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">
            Dashboard for {brandId}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This is your early BakedBot control center. We&apos;ll eventually
            let Craig, Deebo, Smokey & friends run real playbooks from here.
          </p>
        </header>

        {/* Debug panel – keeps us sane while wiring infra */}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
            <div className="font-medium text-destructive">Debug</div>
            <p className="mt-1 text-destructive/90">{error}</p>
          </div>
        )}

        {!error && !hasPlaybooks && (
          <div className="rounded-xl border border-dashed border-border bg-card/60 p-6">
            <h2 className="text-lg font-medium">Playbooks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No playbooks found for <code>{brandId}</code>.
              <br />
              Time to teach Craig some tricks.
            </p>
          </div>
        )}

        {!error && hasPlaybooks && (
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Playbooks</h2>
            <div className="space-y-3">
              {playbooks.map((pb) => (
                <div
                  key={pb.id}
                  className="rounded-lg border bg-card px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">
                        {pb.name || "Untitled playbook"}
                      </div>
                      {pb.description && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {pb.description}
                        </p>
                      )}
                    </div>
                    {pb.status && (
                      <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {pb.status}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    id: <code>{pb.id}</code>
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
