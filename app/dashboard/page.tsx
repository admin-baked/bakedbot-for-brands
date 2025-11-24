// app/dashboard/page.tsx
import DashboardPageClient from "./page-client";
import { createServerClient } from "@/firebase/server-client";

export default async function DashboardPage() {
  // TODO: replace with real brand ID from auth/session
  const brandId = "demo-brand";

  let playbooks: any[] = [];

  try {
    const { firestore } = createServerClient();

    const snap = await firestore
      .collection("playbookDrafts") // or "playbooks" if that’s your collection
      .where("brandId", "==", brandId)
      .get();

    playbooks = snap.docs.map((doc: any) => ({
      id: doc.id,
      ...(doc.data() ?? {}),
    }));
  } catch (err) {
    console.error("Failed to load playbooks for dashboard", err);
    // we just fall back to the empty list
  }

  return (
    <DashboardPageClient
      brandId={brandId}
      initialPlaybooks={playbooks}
    />
  );
}
