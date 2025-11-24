
// app/dashboard/page.tsx
import DashboardPageClient from "./page-client";

export default async function DashboardPage() {
  // TODO: hook up real brandId, Firestore, etc.
  const brandId = "demo-brand";

  // Start with an empty list so the page definitely renders
  const playbooks: any[] = [];

  return (
    <DashboardPageClient
      brandId={brandId}
      initialPlaybooks={playbooks}
    />
  );
}
