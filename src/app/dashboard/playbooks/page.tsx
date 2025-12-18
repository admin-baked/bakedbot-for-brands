'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Search } from 'lucide-react';
import { useUserRole } from '@/hooks/use-user-role';
import { useToast } from '@/hooks/use-toast';
import { ActivityFeed } from './components/activity-feed';
import { UsageMeter } from './components/usage-meter';
import { AgentChat } from './components/agent-chat';
import DispensaryDashboardClient from '../dispensary/dashboard-client';
import { BrandPlaybooksView } from '../brand/components/brand-playbooks-view';

type Playbook = {
  id: string;
  title: string;
  type: 'SIGNAL' | 'AUTOMATION';
  description: string;
  tags: string[];
  active: boolean;
  status: 'active' | 'disabled';
};

const MOCK_PLAYBOOKS: Playbook[] = [
  {
    id: '1',
    title: 'abandon-browse-cart-saver',
    type: 'SIGNAL',
    description: 'Recover lost sales by engaging users who abandoned their cart.',
    tags: ['retention', 'recovery', 'sms', 'email', 'on-site'],
    active: true,
    status: 'active',
  },
  {
    id: '2',
    title: 'competitor-price-drop-watch',
    type: 'SIGNAL',
    description: 'Monitor competitor pricing and alert when they drop below threshold.',
    tags: ['competitive', 'pricing', 'experiments'],
    active: true,
    status: 'active',
  },
  {
    id: '3',
    title: 'new-subscriber-welcome-series',
    type: 'AUTOMATION',
    description: 'Onboard new subscribers with a personalized email sequence.',
    tags: ['email', 'onboarding', 'engagement'],
    active: true,
    status: 'active',
  },
  {
    id: '4',
    title: 'win-back-lapsed-customers',
    type: 'SIGNAL',
    description: 'Re-engage customers who haven\'t purchased in 60 days.',
    tags: ['retention', 'sms', 'discounts'],
    active: false,
    status: 'disabled',
  },
];

export default function PlaybooksPage() {
  const { role, user } = useUserRole();

  // Redirect Dispensary users to their specific console (which includes playbooks)
  if (role === 'dispensary') {
    const brandId = (user as any)?.brandId || user?.uid || 'unknown-dispensary';
    return <DispensaryDashboardClient brandId={brandId} />;
  }

  if (role === 'brand') {
    return <BrandPlaybooksView />;
  }

  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Disabled'>('All');

  const filteredPlaybooks = MOCK_PLAYBOOKS.filter(playbook => {
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
        <AgentChat />
      </section>

      {/* Activity & Usage Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed />
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
          <Button variant="outline" size="sm" className="ml-2" onClick={() => toast({
            title: 'Coming Soon',
            description: 'Manual playbook creation will be available in a future update. Use the Agent Chat above to create playbooks with AI assistance.',
          })}>
            Create Manually
          </Button>
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
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${playbook.type === 'SIGNAL' ? 'text-green-600' : 'text-blue-600'
                      }`}>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
