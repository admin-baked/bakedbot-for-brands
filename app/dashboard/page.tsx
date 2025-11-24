
// app/dashboard/page.tsx
import DashboardPageClient from "./page-client";
import { createServerClient } from "@/firebase/server-client";

export default async function DashboardPage() {
  // TODO: replace with real brandId from auth/session
  const brandId = "demo-brand";

  let playbooks: any[] = [];
  let debug: string | null = null;

  try {
    const { firestore } = createServerClient();

    // Only attempt to fetch data if the Firestore client was initialized
    if (firestore) {
        // 🔍 DEBUG MODE: don't filter by brandId yet, just see what's there.
        const snap = await firestore
          .collection("playbookDrafts") // or "playbooks" if that's the real collection
          .limit(20)
          .get();

        playbooks = snap.docs.map((doc: any) => ({
          id: doc.id,
          ...(doc.data() ?? {}),
        }));
        
        debug = `Loaded ${snap.size} docs from 'playbookDrafts'. brandId used on page: '${brandId}'.`;
    } else {
        debug = "Firestore client not available. Rendering with empty data.";
        console.warn("DashboardPage: Firestore client not available.");
    }
  } catch (err: any) {
    console.error("Failed to load playbooks for dashboard", err);
    debug = `Error loading playbooks: ${err?.message ?? String(err)}`;
  }

  return (
    <DashboardPageClient
      brandId={brandId}
      initialPlaybooks={playbooks}
      debug={debug}
    />
  );
}
