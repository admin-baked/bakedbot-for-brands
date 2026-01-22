'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search } from 'lucide-react';
import { Play, Terminal } from 'lucide-react';
import { useUserRole } from '@/hooks/use-user-role';
import { useToast } from '@/hooks/use-toast';
import { ActivityFeed } from './components/activity-feed';
import { UsageMeter } from './components/usage-meter';
import { AgentChat } from './components/agent-chat';
import { CreatePlaybookDialog } from './components/create-playbook-dialog';
import DispensaryDashboardClient from '../dispensary/dashboard-client';
import { BrandPlaybooksView } from '../brand/components/brand-playbooks-view';
import { PLAYBOOKS } from './data';
import { savePlaybookDraft } from './actions';
import { PlaybookCategory } from '@/types/playbook';

export default function PlaybooksPage() {
  const { role, user } = useUserRole();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Disabled'>('All');
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');

  const handleRunPlaybook = (prompt: string) => {
    setSelectedPrompt(prompt);
    // Smooth scroll to top to see chat
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateFromScratch = async (data: { name: string; description: string; agent: string; category: PlaybookCategory }) => {
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
        title: 'Playbook Created',
        description: `"${data.name}" has been created successfully.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to create playbook',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  };

  const handleCloneTemplate = (templateId: string) => {
    // Set the prompt to create via AI chat
    const templatePrompts: Record<string, string> = {
      'daily_intel': 'Create a playbook for Ezal to generate a daily intelligence snapshot with market activity and competitor moves',
      'lead_followup': 'Create a playbook for Craig to automatically follow up with new leads via email',
      'weekly_kpi': 'Create a playbook for Pops to generate a weekly KPI report for executives',
      'low_stock_alert': 'Create a playbook for Smokey to monitor inventory and alert when items are running low',
    };
    const prompt = templatePrompts[templateId] || `Create a playbook based on template: ${templateId}`;
    setSelectedPrompt(prompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({
      title: 'Template Selected',
      description: 'Use the chat above to customize and create your playbook.',
    });
  };

  // Redirect Dispensary users to their specific console (which includes playbooks)
  if (role === 'dispensary') {
    const brandId = (user as any)?.brandId || user?.uid || 'unknown-dispensary';
    return <DispensaryDashboardClient brandId={brandId} />;
  }

  if (role === 'brand') {
    const brandId = (user as any)?.brandId || user?.uid;
    return <BrandPlaybooksView brandId={brandId} />;
  }


  const filteredPlaybooks = PLAYBOOKS.filter(playbook => {
    const matchesSearch = playbook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      playbook.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'All' ||
      (statusFilter === 'Active' && playbook.active) ||
      (statusFilter === 'Disabled' && !playbook.active);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Playbooks</h1>
        <p className="text-muted-foreground">Manage automation playbooks and workflows.</p>
      </div>

      {/* Agent Builder Chat Interface */}
      <section className="w-full">
        <AgentChat initialInput={selectedPrompt} />
      </section>

      {/* Activity & Usage Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed orgId={(user as any)?.brandId || (user as any)?.currentOrgId || user?.uid} />
        </div>
        <div>
          <UsageMeter />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search playbooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground mr-2">Status:</span>
          {(['All', 'Active', 'Disabled'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? 'bg-muted font-medium' : 'text-muted-foreground'}
            >
              {status}
            </Button>
          ))}
          <CreatePlaybookDialog
            onCreateFromScratch={handleCreateFromScratch}
            onCloneTemplate={handleCloneTemplate}
          />
        </div>
      </div>

      {/* Playbooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlaybooks.map((playbook) => (
          <Card key={playbook.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={
                      `text-[10px] font-bold uppercase tracking-wider 
                      ${playbook.type === 'INTEL' ? 'text-blue-600' :
                        playbook.type === 'OPS' ? 'text-orange-600' :
                          playbook.type === 'COMPLIANCE' ? 'text-red-600' :
                            playbook.type === 'FINANCE' ? 'text-green-600' :
                              'text-purple-600'}`
                    }>
                      {playbook.type}
                    </span>
                  </div>
                  <CardTitle className="text-base font-bold leading-tight">
                    {playbook.title}
                  </CardTitle>
                </div>
                <Switch checked={playbook.active} />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {playbook.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {playbook.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs font-normal bg-muted/50 hover:bg-muted">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="pt-2 mt-auto">
                <Button
                  className="w-full gap-2"
                  variant="default"
                  size="sm"
                  onClick={() => handleRunPlaybook(playbook.prompt)}
                >
                  <Play className="h-3.5 w-3.5" />
                  Run Playbook
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
