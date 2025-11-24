
import DashboardPageComponent from "./page-client";
import { createServerClient } from "@/firebase/server-client";
import type { PlaybookDraft } from "./playbooks/schemas";

export default async function DashboardPage() {
  const { firestore } = createServerClient();

  // TODO: replace with real brandId from auth/session
  const brandId = "demo-brand";

  const snap = await firestore
    .collection("playbookDrafts")
    .where("brandId", "==", brandId)
    .get();

  const initialPlaybooks: PlaybookDraft[] = snap.docs.map((doc: any) => {
    const data = doc.data();
    return {
      id: doc.id,
      brandId: data.brandId ?? brandId,
      name: data.name,
      description: data.description ?? "",
      status: data.status ?? "draft",
      agents: data.agents ?? [],
      tags: data.tags ?? [],
      type: data.type ?? "generic",
      signals: data.signals ?? [],
      targets: data.targets ?? [],
      constraints: data.constraints ?? [],
      createdAt: data.createdAt?.toDate() ?? new Date(),
      updatedAt: data.updatedAt?.toDate() ?? new Date(),
    };
  });

  return (
    <DashboardPageComponent
      brandId={brandId}
      initialPlaybooks={initialPlaybooks}
    />
  );
}
