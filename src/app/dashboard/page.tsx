
// app/dashboard/page.tsx
import DashboardPageComponent from "./page-client";
import { createServerClient } from "@/firebase/server-client";

export default async function DashboardPage() {
  const { firestore } = createServerClient();

  // TODO: real brandId from auth/session
  const brandId = "demo-brand";

  // You can swap this for a helper like getPlaybookDraftsForDashboard later.
  const snap = await firestore
    .collection("playbooks")
    .where("brandId", "==", brandId)
    .get();

  const playbooks = snap.docs.map((doc: any) => ({
    id: doc.id,
    ...(doc.data() ?? {}),
  }));

  return (
    <DashboardPageComponent
      brandId={brandId}
      initialPlaybooks={playbooks}
    />
  );
}
