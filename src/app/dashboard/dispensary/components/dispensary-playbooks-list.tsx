import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Search, Plus, Play, Clock, Bot, TrendingUp, AlertCircle, ShoppingBag, FileText, Settings, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDispensaryPlaybooks, toggleDispensaryPlaybook, type DispensaryPlaybook } from '../actions';
import { useUserRole } from '@/hooks/use-user-role';

interface Playbook extends DispensaryPlaybook {}

export function DispensaryPlaybooksList({ dispensaryId }: { dispensaryId: string }) {
    const { toast } = useToast();
    const { hasDispensaryAdminAccess } = useUserRole();
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPlaybooks = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getDispensaryPlaybooks(dispensaryId);
            setPlaybooks(data);
        } catch (error) {
            console.error('Failed to load playbooks:', error);
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Failed to load playbooks from Firestore."
            });
        } finally {
            setLoading(false);
        }
    }, [dispensaryId, toast]);

    useEffect(() => {
        loadPlaybooks();
    }, [loadPlaybooks]);

    const togglePlaybook = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        
        // Optimistic update
        setPlaybooks(prev => prev.map(pb =>
            pb.id === id ? { ...pb, active: newStatus } : pb
        ));

        const result = await toggleDispensaryPlaybook(dispensaryId, id, newStatus);
        
        if (result.success) {
            toast({
                title: "Playbook Updated",
                description: `Playbook is now ${newStatus ? 'active' : 'inactive'}.`
            });
        } else {
            // Revert on failure
            setPlaybooks(prev => prev.map(pb =>
                pb.id === id ? { ...pb, active: currentStatus } : pb
            ));
            toast({
                variant: 'destructive',
                title: "Update Failed",
                description: "Could not sync status with Firestore."
            });
        }
    };

    const runPlaybook = (id: string, category: string) => {
        toast({
            title: "Accessing Playbook",
            description: `Opening ${id}...`
        });
        
        // Wire up playbooks to actual tools
        const routes: Record<string, string> = {
            'menu-health': '/dashboard/menu',
            'compliance-preflight': '/dashboard/compliance', 
            'slow-mover': '/dashboard/inventory',
            'oos-alert': '/dashboard/inventory',
            'vip-nudge': '/dashboard/marketing', 
            'competitor-watch': '/dashboard/intelligence',
            'ops-digest': '/dashboard/dispensary'
        };

        if (routes[id]) {
            setTimeout(() => window.location.href = routes[id], 500);
        } else {
             // Default fallback for generic system playbooks
             if (category === 'menu') window.location.href = '/dashboard/menu';
             else if (category === 'marketing') window.location.href = '/dashboard/customers';
             else if (category === 'reporting') window.location.href = '/dashboard/analytics';
        }
    };

    const filtered = playbooks.filter(pb => {
        const matchesSearch = pb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pb.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || pb.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header / Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 no-scrollbar">
                    {['all', 'menu', 'marketing', 'inventory', 'compliance', 'reporting', 'loyalty'].map(cat => (
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
                {filtered.length === 0 ? (
                    <div className="col-span-full py-12 text-center border rounded-lg bg-muted/20">
                         <div className="text-muted-foreground mb-2">No playbooks found</div>
                         <Button variant="outline" size="sm" onClick={loadPlaybooks}>
                              Refresh List
                         </Button>
                    </div>
                ) : filtered.map(pb => (
                    <Card key={pb.id} className="hover:bg-muted/30 transition-colors">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">{pb.name}</CardTitle>
                                        {!pb.active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                                    </div>
                                    <CardDescription className="text-xs">{pb.description}</CardDescription>
                                </div>
                                <Switch
                                    checked={pb.active}
                                    onCheckedChange={() => togglePlaybook(pb.id, pb.active)}
                                    disabled={!hasDispensaryAdminAccess}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        {(pb.agents || []).map(agent => (
                                            <Badge key={agent} variant="secondary" className="text-[10px] px-1.5 h-5">
                                                {agent}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(pb.runsToday || 0) > 0 && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {pb.runsToday} runs today
                                        </span>
                                    )}
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => runPlaybook(pb.id, pb.category)}>
                                        <Play className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
