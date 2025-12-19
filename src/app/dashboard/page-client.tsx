"use client";

import * as React from "react";
import { savePlaybookDraft } from "./playbooks/actions";
import { LocalCompetitionCard } from "@/components/dashboard/local-competition-card";
import { IngestionTracker } from "@/components/dashboard/ingestion-tracker";
import { useDataJobsListener } from "@/lib/firebase/data-jobs-listener";
import { useFirebase } from "@/firebase/provider";

import { logger } from '@/lib/logger';
type DashboardPageClientProps = {
  brandId: string;
  initialPlaybooks?: any[];
  userState?: string;  // User's state from profile
  userCity?: string;   // User's city from profile
  userId?: string;     // User ID for data jobs listener
};

export default function DashboardPageComponent({
  brandId,
  initialPlaybooks = [],
  userState = 'Michigan',  // Default for demo
  userCity,
  userId,
}: DashboardPageClientProps) {
  const [list, setList] = React.useState<any[]>(initialPlaybooks);
  const [isSaving, startSaving] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  // Listen for data job updates
  useDataJobsListener(userId);

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
        logger.error("Failed to save draft", err);
        setError("Failed to save draft. See console for details.");
      }
    });
  }

  return (
    <main className="p-6 space-y-6">
      {/* Ingestion Tracker - Shows sync progress for newly onboarded entities */}
      <IngestionTracker className="mb-2" />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Overview
        </h1>
        <p className="text-muted-foreground">High-level summary of agents, campaigns, and revenue.</p>
      </div>

      {/* Welcome Card */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-green-600">WELCOME BACK</p>
          <h2 className="text-2xl font-bold">Your AI agents are on shift.</h2>
          <p className="text-muted-foreground max-w-3xl">
            This is your command center for <strong>autonomous cannabis commerce</strong>. Keep customers in your brand funnel while Smokey, Craig, Pops and crew handle the heavy lifting.
          </p>
          <p className="text-muted-foreground">
            Start by tuning your <strong>agents</strong> and <strong>account settings</strong>, then plug in menus, campaigns, and analytics.
          </p>
        </div>
      </div>

      {/* Action Cards + Competition */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Tune your agents</h3>
          <p className="text-muted-foreground mb-4">
            Set guardrails, tones, and goals so Smokey, Craig, and Pops reflect your brand voice and priorities.
          </p>
          <a href="/dashboard/agents" className="text-sm font-medium text-green-600 hover:underline">
            Go to Agents →
          </a>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Lock in your brand account</h3>
          <p className="text-muted-foreground mb-4">
            Add your brand details, jurisdictions, and stack so Deebo and Money Mike stay compliant and margin-aware.
          </p>
          <a href="/dashboard/settings" className="text-sm font-medium text-green-600 hover:underline">
            Open Account Settings →
          </a>
        </div>

        {/* Local Competition Card */}
        <LocalCompetitionCard state={userState} city={userCity} />
      </div>

      <section className="space-y-2 mt-4">
        {list.length > 0 && (
          <>
            <h2 className="text-lg font-medium">Recent Playbooks</h2>
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
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
