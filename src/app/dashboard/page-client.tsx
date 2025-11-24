
'use client';

import { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Bot, ChevronDown, Search, Sparkles } from 'lucide-react';
import { createPlaybookSuggestion, type SuggestionFormState } from './actions';
import { PlaybookSuggestionDialog } from './components/playbook-suggestion-dialog';
import type { Playbook } from '@/types/domain';

const initialSuggestionState: SuggestionFormState = {
  message: '',
  error: false,
  suggestion: undefined,
}

function PlaybookCard({ playbook, onToggle }: { playbook: Playbook; onToggle: () => void; }) {
  const kindLabel = playbook.type === 'signal' ? 'SIGNAL' : 'AUTOMATION';

  return (
    <article className="bg-card/5 border border-border rounded-2xl px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs">
        <div className="inline-flex items-center gap-1 text-muted-foreground">
          <span className="uppercase tracking-wide font-semibold">
            {kindLabel}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronDown className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Duplicate</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Switch checked={playbook.enabled} onCheckedChange={onToggle} />
      </div>
      <div className="text-sm font-semibold break-words text-foreground">
        {playbook.name}
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        {playbook.tags.map((tag) => (
          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

interface DashboardPageComponentProps {
    initialPlaybooks: Playbook[];
}

export default function DashboardPageComponent({ initialPlaybooks }: DashboardPageComponentProps) {
  const [playbooks, setPlaybooks] = useState(initialPlaybooks);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  
  const [suggestionState, formAction] = useFormState(createPlaybookSuggestion, initialSuggestionState);

  useEffect(() => {
    if (suggestionState.suggestion) {
      setIsSuggestionOpen(true);
    }
  }, [suggestionState.suggestion]);
  
   // Sync state if server-provided props change
  useEffect(() => {
    setPlaybooks(initialPlaybooks);
  }, [initialPlaybooks]);

  const filteredPlaybooks = playbooks.filter((pb) => {
    if (statusFilter === 'active' && !pb.enabled) return false;
    if (statusFilter === 'disabled' && pb.enabled) return false;
    if (searchTerm && !pb.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleToggle = (id: string) => {
    setPlaybooks((prev) =>
      prev.map((pb) => (pb.id === id ? { ...pb, enabled: !pb.enabled } : pb))
    );
  };
  
  return (
    <>
      <PlaybookSuggestionDialog 
        isOpen={isSuggestionOpen}
        onOpenChange={setIsSuggestionOpen}
        suggestion={suggestionState.suggestion}
      />
      <main className="flex-1 overflow-y-auto space-y-8">
        {/* The header is now handled by the layout */}

        {/* Build your AI Agent Workforce */}
        <form action={formAction}>
            <section className="bg-muted/40 border border-dashed rounded-2xl px-6 py-5 flex flex-col gap-3">
            <div className="flex justify-between items-center gap-4">
                <div className="space-y-1">
                <div className="text-sm tracking-wide text-primary font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    <span className="uppercase">Build Your AI Agent Workforce</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-lg">
                    Type what you want your agents to do. Smokey will propose
                    a Playbook and let you review before going live.
                </p>
                </div>
                <Button type="submit" className="hidden md:inline-flex">
                Create Agent
                </Button>
            </div>

            <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                <Bot className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <Input
                    type="text"
                    name="command"
                    placeholder="e.g., Send a daily summary of cannabis industry news to my email."
                    className="pl-9"
                />
                </div>
                <Button type="submit" className="inline-flex md:hidden">
                Create
                </Button>
            </div>
            </section>
        </form>

        {/* Filters + Playbooks list */}
        <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="text"
                placeholder="Search playbooks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
            />
            </div>
            <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Status:</span>
                 <Button
                    variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter('all')}
                    >
                    All
                 </Button>
                 <Button
                    variant={statusFilter === 'active' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter('active')}
                    >
                    Active
                 </Button>
                  <Button
                    variant={statusFilter === 'disabled' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setStatusFilter('disabled')}
                    >
                    Disabled
                 </Button>
            </div>
            <Button variant="outline">
                Create Manually
            </Button>
            </div>
        </div>
        
        {filteredPlaybooks.length === 0 ? (
             <div className="text-center py-20 my-8 bg-muted/40 rounded-lg">
                <p className="mt-2 text-sm text-muted-foreground">
                    No playbooks found. Create one above to get started.
                </p>
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPlaybooks.map((pb) => (
                <PlaybookCard
                    key={pb.id}
                    playbook={pb}
                    onToggle={() => handleToggle(pb.id)}
                />
                ))}
            </div>
        )}
        </section>
    </main>
    </>
  );
}
