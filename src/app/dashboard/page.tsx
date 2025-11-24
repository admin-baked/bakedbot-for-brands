import DashboardPageComponent from "./page-client";
import { createServerClient } from "@/firebase/server-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const brandId = "demo-brand"; // TODO: wire this to real brand from auth/session

  let initialPlaybooks: any[] = [];

  try {
    const { firestore } = createServerClient();

    const snap = await firestore
      .collection("playbookDrafts")
      .where("brandId", "==", brandId)
      .get();

    initialPlaybooks = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() ?? {}),
    }));

    console.log(
      `Dashboard debug: loaded ${initialPlaybooks.length} playbook drafts for brand ${brandId}`
    );
  } catch (err) {
    console.error("Dashboard debug: error loading playbook drafts", err);
  }

  return (
    <DashboardPageComponent
      brandId={brandId}
      initialPlaybooks={initialPlaybooks}
    />
  );
}
