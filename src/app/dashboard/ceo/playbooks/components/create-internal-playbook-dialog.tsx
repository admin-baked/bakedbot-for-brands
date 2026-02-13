'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createSuperUserPlaybook } from '../actions';

type InternalAgentId =
    | 'smokey'
    | 'craig'
    | 'pops'
    | 'ezal'
    | 'money_mike'
    | 'deebo'
    | 'mrs_parker'
    | 'day_day'
    | 'big_worm'
    | 'roach'
    | 'puff';

const DEFAULT_STEPS_JSON = `[
  {
    "action": "delegate",
    "agent": "pops",
    "params": { "task": "Describe what to do here" }
  }
]`;

export function CreateInternalPlaybookDialog({
    onCreated,
}: {
    onCreated?: () => void;
}) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [agent, setAgent] = useState<InternalAgentId>('pops');
    const [category, setCategory] = useState('ops');
    const [cron, setCron] = useState('');
    const [stepsJson, setStepsJson] = useState(DEFAULT_STEPS_JSON);

    const isValid = useMemo(() => {
        return name.trim().length >= 3 && description.trim().length >= 10;
    }, [name, description]);

    const handleCreate = async () => {
        if (!isValid || isCreating) return;
        setIsCreating(true);

        try {
            let steps: any[] = [];
            const trimmed = stepsJson.trim();
            if (trimmed) {
                const parsed = JSON.parse(trimmed);
                if (!Array.isArray(parsed)) {
                    throw new Error('Steps JSON must be an array.');
                }
                steps = parsed;
            }

            const triggers: any[] = [{ type: 'manual' }];
            if (cron.trim()) {
                triggers.push({
                    type: 'schedule',
                    cron: cron.trim(),
                    timezone: 'America/New_York',
                });
            }

            const result = await createSuperUserPlaybook({
                name: name.trim(),
                description: description.trim(),
                agent,
                category,
                triggers,
                steps,
            });

            if (!result.success || !result.playbook) {
                throw new Error(result.error || 'Failed to create playbook.');
            }

            toast({
                title: 'Playbook created',
                description: `Created "${result.playbook.name}"`,
            });
            setOpen(false);
            onCreated?.();
        } catch (e: any) {
            toast({
                title: 'Create failed',
                description: e?.message || 'Unknown error',
                variant: 'destructive',
            });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">New Playbook</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create Internal Playbook</DialogTitle>
                    <DialogDescription>
                        Creates a playbook under `playbooks_internal`. Steps are stored as JSON and can be executed by internal tooling.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="pb-name">Name</Label>
                        <Input id="pb-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekly Platform Health Check" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="pb-desc">Description</Label>
                        <Textarea
                            id="pb-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What this automation does and who it’s for."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Owner Agent</Label>
                            <Select value={agent} onValueChange={(v) => setAgent(v as InternalAgentId)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select agent" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pops">Pops</SelectItem>
                                    <SelectItem value="smokey">Smokey</SelectItem>
                                    <SelectItem value="craig">Craig</SelectItem>
                                    <SelectItem value="ezal">Ezal</SelectItem>
                                    <SelectItem value="money_mike">Money Mike</SelectItem>
                                    <SelectItem value="deebo">Deebo</SelectItem>
                                    <SelectItem value="mrs_parker">Mrs. Parker</SelectItem>
                                    <SelectItem value="day_day">Day Day</SelectItem>
                                    <SelectItem value="big_worm">Big Worm</SelectItem>
                                    <SelectItem value="roach">Roach</SelectItem>
                                    <SelectItem value="puff">Puff</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ops">Ops</SelectItem>
                                    <SelectItem value="seo">SEO</SelectItem>
                                    <SelectItem value="intel">Intel</SelectItem>
                                    <SelectItem value="reporting">Reporting</SelectItem>
                                    <SelectItem value="marketing">Marketing</SelectItem>
                                    <SelectItem value="compliance">Compliance</SelectItem>
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="pb-cron">Schedule (CRON, optional)</Label>
                        <Input id="pb-cron" value={cron} onChange={(e) => setCron(e.target.value)} placeholder="0 9 * * 1" />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="pb-steps">Steps (JSON array)</Label>
                        <Textarea
                            id="pb-steps"
                            value={stepsJson}
                            onChange={(e) => setStepsJson(e.target.value)}
                            className="font-mono text-xs"
                            rows={10}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleCreate} disabled={!isValid || isCreating}>
                        {isCreating ? 'Creating...' : 'Create'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

