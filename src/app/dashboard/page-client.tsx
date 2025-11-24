'use client';

import * as React from 'react';
import type { Playbook, PlaybookDraft } from '@/types/domain';
import { savePlaybookDraft } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type DashboardPageClientProps = {
  initialPlaybooks: Playbook[];
  drafts: PlaybookDraft[];
};

type SuggestedPlaybook = {
  name: string;
  description: string;
  agents: string[];
  tags: string[];
};

export default function DashboardPageComponent({
  initialPlaybooks,
  drafts,
}: DashboardPageClientProps) {
  const list = Array.isArray(initialPlaybooks) ? initialPlaybooks : [];
  const initialDrafts = Array.isArray(drafts) ? drafts : [];

  const [prompt, setPrompt] = React.useState('');
  const [suggested, setSuggested] = React.useState<SuggestedPlaybook | null>(
    null,
  );
  const [draftList, setDraftList] = React.useState<PlaybookDraft[]>(initialDrafts);
  const [isSaving, startSaving] = React.useTransition();
  const [saveStatus, setSaveStatus] =
    React.useState<'idle' | 'saved' | 'error'>('idle');

  // Combine drafts and playbooks into a single list for rendering.
  const combinedList: (Playbook | (PlaybookDraft & { isDraft: boolean }))[] = React.useMemo(() => {
    const validDrafts: (PlaybookDraft & { isDraft: boolean })[] = draftList.map((d: any) => ({
      id: d.id,
      brandId: d.brandId || 'demo-brand',
      name: d.name,
      description: d.description,
      kind: 'automation',
      tags: d.tags || [],
      enabled: false, 
      isDraft: true,
      type: d.type,
      signals: d.signals,
      targets: d.targets,
      constraints: d.constraints,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
    return [...validDrafts, ...list];
  }, [list, draftList]);

  function handleSuggest(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) {
      setSuggested(null);
      return;
    }

    const lower = trimmed.toLowerCase();
    const agents: string[] = [];
    const tags: string[] = [];

    if (lower.includes('price') || lower.includes('competitor')) {
      agents.push('Ezal', 'Pops');
      tags.push('competitive', 'pricing');
    }
    if (lower.includes('cart') || lower.includes('abandon')) {
      agents.push('Craig', 'Smokey');
      tags.push('retention', 'recovery');
    }
    if (lower.includes('welcome') || lower.includes('subscriber')) {
      agents.push('Craig');
      tags.push('onboarding', 'email');
    }
    if (agents.length === 0) {
      agents.push('Smokey');
    }

    const nameSlug = trimmed
      .slice(0, 40)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    setSuggested({
      name: nameSlug || 'custom-playbook',
      description: trimmed,
      agents: Array.from(new Set(agents)),
      tags: Array.from(new Set(tags)),
    });
    
    setSaveStatus('idle');
  }
  
  const handleSaveDraft = () => {
    if (!suggested) return;
    setSaveStatus('idle');
    startSaving(async () => {
      try {
        const result = await savePlaybookDraft({
          name: suggested.name,
          description: suggested.description,
          agents: suggested.agents,
          tags: suggested.tags,
        });

        setSaveStatus('saved');

        setDraftList((prev) => [
          {
            id: result?.id ?? `local_${Date.now()}`,
            brandId: 'demo-brand',
            name: suggested.name,
            description: suggested.description,
            agents: suggested.agents,
            tags: suggested.tags,
            createdAt: new Date(),
            updatedAt: new Date(),
            type: 'automation',
            signals: [],
            targets: [],
            constraints: [],
          },
          ...prev,
        ]);
      } catch (e) {
        console.error('Failed to save draft', e);
        setSaveStatus('error');
      }
    });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Playbooks Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your automations, experiments, and agent workflows here.
        </p>
      </header>

      <section className="rounded-2xl border bg-card px-4 py-4 md:px-6 md:py-5 space-y-3">
        <div className="space-y-1">
          <h2 className="font-semibold">
            Build your AI agent workforce
          </h2>
          <p className="text-sm text-muted-foreground">
            Describe a task, and we&apos;ll turn it into a Playbook your agents
            can run.
          </p>
        </div>

        <form
          onSubmit={handleSuggest}
          className="flex flex-col gap-2 md:flex-row"
        >
          <Input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Watch competitor prices in Chicago and alert me when they undercut our 1g vapes."
          />
          <Button
            type="submit"
            className="whitespace-nowrap"
          >
            Create draft
          </Button>
        </form>

        {suggested && (
          <div className="mt-2 rounded-xl border bg-muted/50 px-3 py-3 text-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold truncate">
                Draft: {suggested.name}
              </div>
              <Badge variant="outline" className="border-primary/70 text-primary bg-primary/10">
                Preview only
              </Badge>
            </div>

            <p className="text-muted-foreground">{suggested.description}</p>

            <div className="flex flex-wrap gap-1">
              {suggested.agents.map((a) => (
                <Badge key={a} variant="secondary">
                  {a}
                </Badge>
              ))}
              {suggested.tags.map((tag: string) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                disabled={isSaving}
                onClick={handleSaveDraft}
                size="sm"
              >
                {isSaving ? 'Saving…' : 'Save draft'}
              </Button>

              <div className="text-xs text-muted-foreground">
                {saveStatus === 'saved' && (
                  <span className="text-green-600">
                    Draft saved! It has been added to your list below.
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-destructive">
                    Something went wrong saving the draft.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        {combinedList.length > 0 ? (
          <ul className="space-y-3">
            {combinedList.map((pb: any) => (
              <li
                key={pb.id}
                className="rounded-2xl border bg-card px-4 py-4 text-sm"
              >
                <div className="flex items-center justify-between">
                    <div className="font-medium">{pb.name}</div>
                    {pb.isDraft && <Badge variant="outline" className="text-amber-600 border-amber-500/70 bg-amber-50">Draft</Badge>}
                </div>
                {pb.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pb.description}
                  </p>
                )}
                {Array.isArray(pb.tags) && pb.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pb.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground bg-card">
            No playbooks to show yet. Create a draft above to get started.
          </div>
        )}
      </section>
    </div>
  );
}
