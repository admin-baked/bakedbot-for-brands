'use client';



/**
 * Playbooks Page
 *
 * Modern glassmorphism playbooks page with category filters, toggle switches,
 * and enhanced cards. Preserves role-based views and AgentChat integration.
 */

import { useState, useMemo } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { useToast } from '@/hooks/use-toast';
import { ActivityFeed } from './components/activity-feed';
import { UsageMeter } from './components/usage-meter';
import { AgentChat } from './components/agent-chat';
import { CreatePlaybookDialog } from './components/create-playbook-dialog';
import { BrandPlaybooksView } from '../brand/components/brand-playbooks-view';
import { DispensaryPlaybooksView } from '../dispensary/components/dispensary-playbooks-view';
import { PLAYBOOKS, Playbook } from './data';
import { PlaybooksHeader, PlaybookFilterCategory } from './components/playbooks-header';
import { PlaybookCardModern } from './components/playbook-card-modern';
import { CreatePlaybookBanner } from './components/create-playbook-banner';
import { InboxCTABanner } from '@/components/inbox';
import { savePlaybookDraft } from './actions';
import type { PlaybookCategory } from '@/types/playbook';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function PlaybooksPage() {
    const { role, user } = useUserRole();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<PlaybookFilterCategory>('All');
    const [selectedPrompt, setSelectedPrompt] = useState<string>('');
    const [playbookStates, setPlaybookStates] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(PLAYBOOKS.map((pb) => [pb.id, pb.active]))
    );

    // IMPORTANT: All hooks must be called before any early returns
    // Filter playbooks by search and category
    const filteredPlaybooks = useMemo(() => {
        let result = PLAYBOOKS;

        // Apply category filter
        if (activeFilter !== 'All') {
            result = result.filter(
                (pb) => pb.type.toUpperCase() === activeFilter.toUpperCase()
            );
        }

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (pb) =>
                    pb.title.toLowerCase().includes(query) ||
                    pb.description.toLowerCase().includes(query) ||
                    pb.tags.some((tag) => tag.toLowerCase().includes(query))
            );
        }

        // Add current enabled state to playbooks
        return result.map((pb) => ({
            ...pb,
            active: playbookStates[pb.id] ?? pb.active,
        }));
    }, [searchQuery, activeFilter, playbookStates]);

    const handleRunPlaybook = (playbook: Playbook) => {
        setSelectedPrompt(playbook.prompt);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleTogglePlaybook = (id: string, enabled: boolean) => {
        setPlaybookStates((prev) => ({ ...prev, [id]: enabled }));
        toast({
            title: enabled ? 'Playbook Enabled' : 'Playbook Disabled',
            description: `The playbook has been ${enabled ? 'enabled' : 'disabled'}.`,
        });
    };

    const handleEditPlaybook = (playbook: Playbook) => {
        toast({
            title: 'Edit Playbook',
            description: `Opening editor for "${playbook.title}"...`,
        });
        // TODO: Navigate to playbook editor
    };

    const handleDuplicatePlaybook = (playbook: Playbook) => {
        toast({
            title: 'Playbook Duplicated',
            description: `"${playbook.title}" has been duplicated.`,
        });
        // TODO: Implement duplicate via server action
    };

    const handleDeletePlaybook = (playbook: Playbook) => {
        toast({
            variant: 'destructive',
            title: 'Playbook Deleted',
            description: `"${playbook.title}" has been removed.`,
        });
        // TODO: Implement delete via server action
    };

    const handleCreateFromScratch = async (data: {
        name: string;
        description: string;
        agent: string;
        category: PlaybookCategory;
    }) => {
        try {
            await savePlaybookDraft({
                name: data.name,
                description: data.description,
                agent: data.agent,
                category: data.category,
                steps: [],
                triggers: [],
            });

            toast({
                title: 'Playbook Draft Created',
                description: `"${data.name}" has been saved. Use chat to refine steps and triggers.`,
            });

            setSelectedPrompt(
                `Create a playbook named "${data.name}".\n\nDescription: ${data.description || '(none)'}\nAgent: ${data.agent}\nCategory: ${data.category}\n\nStart by proposing triggers and the first 3 steps.`
            );
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to create playbook draft',
            });
        }
    };

    const handleCloneTemplate = async (templateId: string) => {
        const templates: Record<
            string,
            { name: string; description: string; agent: string; category: PlaybookCategory }
        > = {
            daily_intel: {
                name: 'Daily Intelligence Snapshot',
                description:
                    'Morning report on market activity, competitor moves, and key metrics',
                agent: 'ezal',
                category: 'intel',
            },
            lead_followup: {
                name: 'Lead Follow-up',
                description: 'Automated follow-up email sequence for new leads',
                agent: 'craig',
                category: 'marketing',
            },
            weekly_kpi: {
                name: 'Weekly KPI Report',
                description: 'Executive summary of key performance indicators',
                agent: 'pops',
                category: 'reporting',
            },
            low_stock_alert: {
                name: 'Low Stock Alert',
                description: 'Monitor inventory and alert when items are running low',
                agent: 'smokey',
                category: 'ops',
            },
        };

        const template = templates[templateId];
        if (!template) {
            toast({
                variant: 'destructive',
                title: 'Template Not Found',
                description: 'That template is not available yet.',
            });
            return;
        }

        await handleCreateFromScratch(template);
    };

    const handleCreateFromNaturalLanguage = async (prompt: string) => {
        setSelectedPrompt(prompt);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast({
            title: 'Playbook Prompt Ready',
            description: 'Agent chat is ready to build your playbook from this description.',
        });
    };

    const handleNewPlaybook = () => {
        // Scroll to AgentChat and set prompt for new playbook
        setSelectedPrompt('Create a new playbook for my brand');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Role-based redirects (AFTER all hooks)
    const isDispensaryRole = role === 'dispensary' || role === 'dispensary_admin' || role === 'dispensary_staff';
    const isBrandRole = role === 'brand' || role === 'brand_admin' || role === 'brand_member';

    if (isDispensaryRole) {
        const orgId = (user as any)?.currentOrgId || (user as any)?.orgId || user?.uid || '';
        return <DispensaryPlaybooksView orgId={orgId} />;
    }

    if (isBrandRole) {
        const brandId = (user as any)?.brandId || (user as any)?.orgId || (user as any)?.currentOrgId || user?.uid;
        return <BrandPlaybooksView brandId={brandId} />;
    }

    // Super user / other roles see the full playbooks UI
    return (
        <div className="space-y-8 p-6 max-w-[1600px] mx-auto">
            {/* Header with Search and Filters */}
            <PlaybooksHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                onNewPlaybook={handleNewPlaybook}
                newPlaybookButton={
                    <CreatePlaybookDialog
                        onCreateFromScratch={handleCreateFromScratch}
                        onCloneTemplate={handleCloneTemplate}
                        onCreateFromNaturalLanguage={handleCreateFromNaturalLanguage}
                        trigger={
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2">
                                <Plus className="w-5 h-5" />
                                New Playbook
                            </Button>
                        }
                    />
                }
            />

            {/* Inbox CTA Banner */}
            <InboxCTABanner variant="playbooks" />

            {/* Agent Builder Chat Interface */}
            <section className="w-full">
                <AgentChat initialInput={selectedPrompt} />
            </section>

            {/* Activity & Usage Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ActivityFeed
                        orgId={
                            (user as any)?.brandId ||
                            (user as any)?.currentOrgId ||
                            user?.uid
                        }
                    />
                </div>
                <div>
                    <UsageMeter />
                </div>
            </div>

            {/* Playbooks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlaybooks.map((playbook) => (
                    <PlaybookCardModern
                        key={playbook.id}
                        playbook={playbook}
                        onToggle={handleTogglePlaybook}
                        onRun={handleRunPlaybook}
                        onEdit={handleEditPlaybook}
                        onDuplicate={handleDuplicatePlaybook}
                        onDelete={handleDeletePlaybook}
                    />
                ))}
            </div>

            {/* Empty State */}
            {filteredPlaybooks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No playbooks found matching your criteria.</p>
                </div>
            )}

            {/* Create Playbook Banner */}
            <CreatePlaybookBanner onClick={handleNewPlaybook} />
        </div>
    );
}
