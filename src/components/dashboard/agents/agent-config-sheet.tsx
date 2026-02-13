'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Settings, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateAgentConfigAction, AgentConfigOverride } from '@/app/actions/agent-config';
import { useToast } from '@/hooks/use-toast';
import { AgentDefinition } from '@/config/agents';

interface AgentConfigSheetProps {
    agent: AgentDefinition;
    initialConfig?: AgentConfigOverride | null;
}

export function AgentConfigSheet({ agent, initialConfig }: AgentConfigSheetProps) {
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Form state
    const [name, setName] = useState(initialConfig?.name || agent.name);
    const [title, setTitle] = useState(initialConfig?.title || agent.title);
    const [status, setStatus] = useState<'online' | 'training' | 'paused'>(initialConfig?.status || agent.status);
    const [systemPrompt, setSystemPrompt] = useState(initialConfig?.systemPrompt || '');

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateAgentConfigAction(agent.id, {
            name,
            title,
            status,
            systemPrompt
        });

        if (result.success) {
            toast({
                title: "Agent Updated",
                description: `${agent.name} configuration has been saved.`,
            });
            setOpen(false);
        } else {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: result.error || "Failed to save agent configuration.",
            });
        }
        setIsSaving(false);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Configure {agent.name}</SheetTitle>
                    <SheetDescription>
                        Customize your agent's identity and core instructions for your brand.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 py-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Display Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Super Smokey"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Title / Role</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Lead Budtender"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="training">Training</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="prompt">System Prompt / Instructions</Label>
                        <Textarea
                            id="prompt"
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="Overwrite the default system instructions for this agent..."
                            className="min-h-[200px]"
                        />
                        <p className="text-xs text-muted-foreground italic">
                            Leave empty to use the standard persona instructions.
                        </p>
                    </div>
                </div>

                <SheetFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
