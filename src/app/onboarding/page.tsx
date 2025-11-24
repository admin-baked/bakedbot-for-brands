
// src/app/onboarding/page.tsx

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Brand onboarding</h1>
      <p className="text-muted-foreground">
        This is a placeholder for the onboarding flow. The goal is to keep the
        build stable while we finish wiring up the new dashboard and agents.
      </p>

      <p className="text-sm">
        You can always reach the dashboard at{" "}
        <a href="/dashboard" className="underline">
          /dashboard
        </a>
        .
      </p>
    </main>
  );
}
