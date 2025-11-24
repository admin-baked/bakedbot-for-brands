
"use client";

import * as React from "react";
import { savePlaybookDraft } from "./playbooks/actions";

type DashboardPageClientProps = {
  brandId: string;
  initialPlaybooks?: any[];
};

export default function DashboardPageComponent({
  brandId,
  initialPlaybooks = [],
}: DashboardPageClientProps) {
  const [list, setList] = React.useState<any[]>(initialPlaybooks);
  const [isSaving, startSaving] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  async function handleCreateSampleDraft() {
    setError(null);

    startSaving(async () => {
      try {
        const draft = await savePlaybookDraft({
          brandId,
          name: "Sample automation for " + brandId,
          description: "A test playbook draft created from the dashboard.",
        });

        setList((prev) => [draft, ...prev]);
      } catch (err: any) {
        console.error("Failed to save draft", err);
        setError("Failed to save draft. See console for details.");
      }
    });
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">
        Dashboard for {brandId}
      </h1>

      <section className="space-y-2">
        <button
          onClick={handleCreateSampleDraft}
          disabled={isSaving}
          className="inline-flex items-center rounded-md border px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-60"
        >
          {isSaving ? "Creating draft..." : "Create sample playbook draft"}
        </button>

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}
      </section>

      <section className="space-y-2 mt-4">
        {list.length === 0 ? (
          <p>No playbooks yet. Time to teach Craig some tricks.</p>
        ) : (
          <>
            <h2 className="text-lg font-medium">Playbook drafts</h2>
            <ul className="space-y-1">
              {list.map((pb, idx) => (
                <li
                  key={pb.id ?? idx}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <div className="font-medium">
                    {pb.name ?? "Untitled playbook"}
                  </div>
                  {pb.description && (
                    <p className="text-xs text-gray-500">
                      {pb.description}
                    </p>
                  )}
                  {pb.status && (
                    <p className="text-xs text-gray-400 mt-1">
                      Status: {pb.status}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
