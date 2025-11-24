
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PlaybookDraft } from '@/types/domain';
import { Bot, Signal, Cog, Users, CheckCircle, CircleDot, Filter } from 'lucide-react';

interface PlaybookSuggestionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion?: PlaybookDraft;
}

const DetailRow = ({ icon: Icon, label, value, isList = false }: { icon: React.ElementType, label: string, value?: string | string[], isList?: boolean }) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;

  return (
    <div className="flex items-start text-sm">
      <Icon className="h-4 w-4 mr-3 mt-1 text-muted-foreground flex-shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-foreground/80">{label}</p>
        {isList && Array.isArray(value) ? (
          <div className="flex flex-wrap gap-1 mt-1">
            {value.map(item => <Badge key={item} variant="secondary">{item}</Badge>)}
          </div>
        ) : (
          <p className="text-muted-foreground">{value}</p>
        )}
      </div>
    </div>
  );
};


export function PlaybookSuggestionDialog({
  isOpen,
  onOpenChange,
  suggestion,
}: PlaybookSuggestionDialogProps) {
  if (!suggestion) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            AI Playbook Suggestion
          </DialogTitle>
          <DialogDescription>
            Smokey analyzed your command and drafted this playbook. Review and approve to add it to your workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg border bg-muted/50">
                 <p className="font-mono text-base font-semibold">{suggestion.name}</p>
                 <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
            </div>
            <div className="space-y-4">
                <DetailRow icon={suggestion.type === 'signal' ? Signal : Cog} label="Type" value={suggestion.type} />
                <DetailRow icon={Users} label="Agents" value={suggestion.agents} isList />
                <DetailRow icon={CircleDot} label="Signals" value={suggestion.signals} isList />
                <DetailRow icon={CheckCircle} label="Targets" value={suggestion.targets} isList />
                <DetailRow icon={Filter} label="Constraints" value={suggestion.constraints} isList />
            </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Approve & Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
