// app/dashboard/page.tsx
import DashboardPageComponent from "./page-client";
import { createServerClient } from "@/firebase/server-client";
import type { PlaybookDraft } from "./playbooks/schemas";
import { getPlaybookDraftsForDashboard } from "./actions";

export default async function DashboardPage() {
  
  // TODO: replace with real brandId from auth/session
  const brandId = "demo-brand";
  const playbooks = await getPlaybookDraftsForDashboard(brandId);


  return (
    <DashboardPageComponent
      brandId={brandId}
      initialPlaybooks={playbooks}
    />
  );
}
