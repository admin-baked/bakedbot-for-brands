
// app/dashboard/page.tsx
import DashboardPageClient from "./page-client";
import { createServerClient } from "@/firebase/server-client";

export default async function DashboardPage() {
  // TODO: real brand from auth/session
  const brandId = "demo-brand";

  let playbooks: any[] = [];
  let debug: string | null = null;

  try {
    const { firestore } = createServerClient();

    const snap = await firestore
      .collection("playbookDrafts") // or "playbooks" if that's your real collection
      .limit(20)
      .get();

    playbooks = snap.docs.map((doc: any) => ({
      id: doc.id,
      ...(doc.data() ?? {}),
    }));

    debug = `Loaded ${snap.size} docs from 'playbookDrafts'. brandId on page: '${brandId}'.`;
  } catch (err: any) {
    console.error("Failed to load playbooks for dashboard", err);
    debug = `Error loading playbooks: ${err?.message ?? String(err)}`;
  }

  return (
    <DashboardPageClient
      brandId={brandId}
      initialPlaybooks={play