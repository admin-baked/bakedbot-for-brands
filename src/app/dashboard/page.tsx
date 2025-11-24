// src/app/dashboard/page.tsx
import DashboardPageComponent from "./page-client";
import { getPlaybookDraftsForDashboard } from "./actions";
import { requireUser } from "@/server/auth/auth";
import { redirect } from "next/navigation";


export default async function DashboardPage() {
  let user;
  try {
    // This requires a user, but we don't enforce a role on the main dashboard page
    user = await requireUser();
  } catch (error) {
    // If no user, send them to the brand login page
    redirect('/brand-login');
  }

  const brandId = user.brandId || "demo-brand";
  const playbooks = await getPlaybookDraftsForDashboard(brandId);

  return (
    <DashboardPageComponent
      brandId={brandId}
      initialPlaybooks={playbooks}
    />
  );
}
