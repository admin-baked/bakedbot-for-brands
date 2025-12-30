
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Search, Play, Clock, Activity, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listBrandPlaybooks, togglePlaybookStatus, runPlaybookTest, updatePlaybook } from '@/server/actions/playbooks';
import { Playbook } from '@/types/playbook';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PlaybookEditor } from '../../playbooks/components/playbook-editor';

export function BrandPlaybooksList({ brandId }: { brandId: string }) {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const data = await listBrandPlaybooks(brandId);
                setPlaybooks(data);
            } catch (error) {
                console.error("Failed to load playbooks", error);
                toast({ variant: "destructive", title: "Error", description: "Failed to load playbooks" });
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [brandId, toast]);

    const togglePlaybook = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        const newStatus = !currentStatus ? 'active' : 'paused';
        setPlaybooks(prev => prev.map(pb =>
            pb.id === id ? { ...pb, status: newStatus } : pb
        ));

        try {
            await togglePlaybookStatus(brandId, id, !currentStatus);
            toast({
                title: !currentStatus ? "Playbook Activated" : "Playbook Paused",
                description: "Status updated successfully."
            });
        } catch (error) {
            // Revert on failure
            setPlaybooks(prev => prev.map(pb =>
                pb.id === id ? { ...pb, status: currentStatus ? 'active' : 'paused' } : pb
            ));
            toast({ variant: "destructive", title: "Error", description: "Failed to update status" });
        }
    };

    const runPlaybook = async (id: string, name: string) => {
        toast({
            title: "Initiating Test Run",
            description: `Starting simulated run for ${name}...`
        });

        try {
            await runPlaybookTest(brandId, id);
            toast({
                title: "Test Run Complete",
                description: `Successfully executed ${name}. Check your email for results.`
            });

            // Update local state to show incremented run count
            setPlaybooks(prev => prev.map(pb =>
                pb.id === id ? { ...pb, runsToday: (pb.runCount || 0) + 1 } : pb
            ));
        } catch (error) {
            toast({ variant: "destructive", description: "Failed to execute test run." });
        }
    };

    const handleSavePlaybook = async (data: Partial<Playbook>) => {
        if (!editingPlaybook) return;
        try {
            const result = await updatePlaybook(brandId, editingPlaybook.id, {
                name: data.name,
                description: data.description,
                agent: data.agent,
                category: data.category,
                triggers: data.triggers,
                steps: data.steps,
                status: data.status,
            });
            if (result.success) {
                toast({ title: "Playbook Updated", description: "Your changes have been saved." });
                // Update local state
                setPlaybooks(prev => prev.map(pb =>
                    pb.id === editingPlaybook.id ? { ...pb, ...data, updatedAt: new Date() } : pb
                ));
                setEditingPlaybook(null);
            } else {
                toast({ variant: "destructive", title: "Error", description: result.error || "Failed to save" });
            }
        } catch (error) {
            toast({ variant: "destructive", description: "Failed to save playbook." });
        }
    };

    const filtered = playbooks.filter(pb => {
        const matchesSearch = pb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pb.description.toLowerCase().includes(searchQuery.toLowerCase());
        // @ts-ignore - Category typing match
        const matchesCategory = categoryFilter === 'all' || (pb.category || 'other') === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return <div className="text-center py-10 text-muted-foreground animate-pulse">Loading operational playbooks...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Header / Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 no-scrollbar">
                    {['all', 'outreach', 'marketing', 'intel', 'pricing', 'compliance', 'reporting', 'content'].map(cat => (
                        <Button
                            key={cat}
                            variant={categoryFilter === cat ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCategoryFilter(cat)}
                            className="capitalize whitespace-nowrap"
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search playbooks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-9"
                        />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(pb => (
                    <Card key={pb.id} className="hover:bg-muted/30 transition-colors">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">{pb.name}</CardTitle>
                                        {pb.status !== 'active' && <Badge variant="outline" className="text-[10px] capitalize">{pb.status}</Badge>}
                                        {pb.status === 'active' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Live Monitoring Active" />}
                                    </div>
                                    <CardDescription className="text-xs line-clamp-2">{pb.description}</CardDescription>
                                </div>
                                <Switch
                                    checked={pb.status === 'active'}
                                    onCheckedChange={() => togglePlaybook(pb.id, pb.status === 'active')}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    {(pb.runCount || 0) > 0 && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {pb.runCount} runs
                                        </span>
                                    )}
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-green-50 hover:text-green-600" onClick={() => runPlaybook(pb.id, pb.name)}>
                                        <Play className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600" onClick={() => setEditingPlaybook(pb)}>
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Edit Playbook Dialog */}
            <Dialog open={!!editingPlaybook} onOpenChange={(open) => !open && setEditingPlaybook(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Playbook</DialogTitle>
                    </DialogHeader>
                    {editingPlaybook && (
                        <PlaybookEditor
                            playbook={editingPlaybook}
                            onSave={handleSavePlaybook}
                            onCancel={() => setEditingPlaybook(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
