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
import DispensaryDashboardClient from '../dispensary/dashboard-client';
import { BrandPlaybooksView } from '../brand/components/brand-playbooks-view';
import { PLAYBOOKS, Playbook } from './data';
import { PlaybooksHeader, PlaybookFilterCategory } from './components/playbooks-header';
import { PlaybookCardModern } from './components/playbook-card-modern';
import { CreatePlaybookBanner } from './components/create-playbook-banner';

export default function PlaybooksPage() {
    const { role, user } = useUserRole();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<PlaybookFilterCategory>('All');
    const [selectedPrompt, setSelectedPrompt] = useState<string>('');
    const [playbookStates, setPlaybookStates] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(PLAYBOOKS.map((pb) => [pb.id, pb.active]))
    );

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

    const handleNewPlaybook = () => {
        // Scroll to AgentChat and set prompt for new playbook
        setSelectedPrompt('Create a new playbook for my brand');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Redirect Dispensary users to their specific console
    if (role === 'dispensary') {
        const brandId = (user as any)?.brandId || user?.uid || 'unknown-dispensary';
        return <DispensaryDashboardClient brandId={brandId} />;
    }

    if (role === 'brand') {
        const brandId = (user as any)?.brandId || user?.uid;
        return <BrandPlaybooksView brandId={brandId} />;
    }

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

    return (
        <div className="space-y-8 p-6 max-w-[1600px] mx-auto">
            {/* Header with Search and Filters */}
            <PlaybooksHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                onNewPlaybook={handleNewPlaybook}
            />

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
