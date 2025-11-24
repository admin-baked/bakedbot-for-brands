"use client";

import * as React from "react";
import type { PlaybookDraft } from "./playbooks/schemas";
import { savePlaybookDraft } from "./playbooks/actions";

type DashboardPageClientProps = {
  brandId: string;
  initialPlaybooks: PlaybookDraft[];
};

export default function DashboardPageComponent({
  brandId,
  initialPlaybooks,
}: DashboardPageClientProps) {
  const [list, setList] = React.useState<PlaybookDraft[]>(initialPlaybooks);
  const [isSaving, startSaving] = React.useTransition();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();

    // Avoid empty drafts
    if (!name.trim()) return;

    startSaving(async () => {
      try {
        const draft = await savePlaybookDraft({
          brandId,
          name: name.trim(),
          description: description.trim() || undefined,
          agents: [], // wire up later
          tags: [],   // wire up later
        });

        // Update local list
        setList((prev) => [draft, ...prev]);

        // Reset form
        setName("");
        setDescription("");
      } catch (err) {
        console.error("Failed to save draft", err);
        // Optional: surface error in UI
        alert("Failed to save draft. Check console for details.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* New draft form */}
      <form onSubmit={handleSaveDraft} className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">
            Draft name
          </label>
          <input
            className="w-full rounded-md border px-2 py-1 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.g. Abandoned cart saver for 1g vapes"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">
            Description
          </label>
          <textarea
            className="w-full rounded-md border px-2 py-1 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should this automation do?"
          />
        </div>
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium"
        >
          {isSaving ? "Saving…" : "Save draft"}
        </button>
      </form>

      {/* Draft list */}
      <section className="space-y-3">
        {list.length > 0 ? (
          <ul className="space-y-2">
            {list.map((pb) => (
              <li
                key={pb.id}
                className="rounded-xl border p-3 text-sm flex justify-between"
              >
                <div>
                  <div className="font-medium">{pb.name}</div>
                  {pb.description && (
                    <p className="text-xs text-muted-foreground">
                      {pb.description}
                    </p>
                  )}
                </div>
                <span className="text-[10px] uppercase text-muted-foreground">
                  {pb.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            No drafts yet. Create your first automation idea above.
          </div>
        )}
      </section>
    </div>
  );
}
