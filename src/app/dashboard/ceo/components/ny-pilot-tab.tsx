'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  getNY10PilotOrgs,
  getNY10KPIs,
  getNY10PlaybookSummary,
  getNY10CampaignSummary,
  getNY10PromoStatus,
  batchTogglePlaybook,
  type NY10Org,
  type NY10KPIs as NY10KPIsType,
  type NY10PlaybookRow,
  type NY10CampaignItem,
  type NY10PromoStatus as NY10PromoStatusType,
} from '@/server/actions/ny-pilot';
import {
  Loader2,
  Users,
  DollarSign,
  Calendar,
  Zap,
  ExternalLink,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  Target,
  TrendingUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  invited: { label: 'Invited', color: 'bg-gray-100 text-gray-700' },
  'signed-up': { label: 'Signed Up', color: 'bg-yellow-100 text-yellow-700' },
  onboarded: { label: 'Onboarded', color: 'bg-blue-100 text-blue-700' },
  active: { label: 'Active', color: 'bg-green-100 text-green-700' },
};

const PB_STATUS_ICON: Record<string, React.ReactNode> = {
  active: <CheckCircle className="h-3.5 w-3.5 text-green-600" />,
  paused: <Pause className="h-3.5 w-3.5 text-amber-500" />,
  unassigned: <span className="inline-block h-3.5 w-3.5 rounded border border-gray-300" />,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NYPilotTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Data
  const [orgs, setOrgs] = useState<NY10Org[]>([]);
  const [kpis, setKpis] = useState<NY10KPIsType | null>(null);
  const [playbookRows, setPlaybookRows] = useState<NY10PlaybookRow[]>([]);
  const [campaigns, setCampaigns] = useState<NY10CampaignItem[]>([]);
  const [promoStatus, setPromoStatus] = useState<NY10PromoStatusType | null>(null);

  // Filter state for playbooks
  const [pbAgentFilter, setPbAgentFilter] = useState<string>('all');

  // Filter state for campaigns
  const [campOrgFilter, setCampOrgFilter] = useState<string>('all');
  const [campStatusFilter, setCampStatusFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    const [orgsResult, kpisResult, pbResult, campResult, promoResult] = await Promise.allSettled([
      getNY10PilotOrgs(),
      getNY10KPIs(),
      getNY10PlaybookSummary(),
      getNY10CampaignSummary(),
      getNY10PromoStatus(),
    ]);
    if (orgsResult.status === 'fulfilled') setOrgs(orgsResult.value);
    if (kpisResult.status === 'fulfilled') setKpis(kpisResult.value);
    if (pbResult.status === 'fulfilled') setPlaybookRows(pbResult.value);
    if (campResult.status === 'fulfilled') setCampaigns(campResult.value);
    if (promoResult.status === 'fulfilled') setPromoStatus(promoResult.value);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({ title: 'Data refreshed' });
  };

  const handleBatchToggle = async (playbookId: string, active: boolean) => {
    const result = await batchTogglePlaybook(playbookId, active);
    toast({
      title: `${active ? 'Activated' : 'Paused'} across ${result.success} orgs`,
      description: result.failed > 0 ? `${result.failed} failed` : undefined,
    });
    // Refresh playbook data
    const pbData = await getNY10PlaybookSummary();
    setPlaybookRows(pbData);
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filtered data
  const filteredPlaybooks = playbookRows.filter((row) => {
    if (pbAgentFilter !== 'all' && row.agent !== pbAgentFilter) return false;
    return true;
  });

  const filteredCampaigns = campaigns.filter((c) => {
    if (campOrgFilter !== 'all' && c.orgId !== campOrgFilter) return false;
    if (campStatusFilter !== 'all' && c.status !== campStatusFilter) return false;
    return true;
  });

  const uniqueAgents = [...new Set(playbookRows.map(r => r.agent))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">NY Founding Partner Program</h2>
          <p className="text-sm text-muted-foreground">
            Manage all {orgs.length} NY pilot dispensaries from one place
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="kpis">KPIs & OKRs</TabsTrigger>
        </TabsList>

        {/* ============================================================= */}
        {/* OVERVIEW TAB                                                    */}
        {/* ============================================================= */}
        <TabsContent value="overview" className="space-y-6">
          {/* HUD Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Signups</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{orgs.length}</span>
                  <span className="text-sm text-muted-foreground">/ 10</span>
                </div>
                <Progress value={(orgs.length / 10) * 100} className="mt-2 h-1.5" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  <span>Active Orgs</span>
                </div>
                <div className="mt-1">
                  <span className="text-2xl font-bold">{kpis?.activeOrgs ?? 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Avg Days Active</span>
                </div>
                <div className="mt-1">
                  <span className="text-2xl font-bold">{kpis?.avgDaysActive ?? 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Combined MRR</span>
                </div>
                <div className="mt-1">
                  <span className="text-2xl font-bold">${kpis?.combinedMrr ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-org status table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pilot Dispensaries</CardTitle>
            </CardHeader>
            <CardContent>
              {orgs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No NY pilot orgs found. Use the batch onboarding script to add dispensaries.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Dispensary</th>
                        <th className="pb-2 pr-4 font-medium">City</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 pr-4 font-medium">POS</th>
                        <th className="pb-2 pr-4 font-medium">Playbooks</th>
                        <th className="pb-2 pr-4 font-medium">Customers</th>
                        <th className="pb-2 pr-4 font-medium">Promo</th>
                        <th className="pb-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgs.map((org) => {
                        const statusCfg = STATUS_CONFIG[org.status] || STATUS_CONFIG.invited;
                        const orgKpi = kpis?.orgs.find(k => k.orgId === org.orgId);
                        return (
                          <tr key={org.orgId} className="border-b last:border-0">
                            <td className="py-3 pr-4 font-medium">{org.name}</td>
                            <td className="py-3 pr-4">{org.city}</td>
                            <td className="py-3 pr-4">
                              <Badge variant="secondary" className={statusCfg.color}>
                                {statusCfg.label}
                              </Badge>
                            </td>
                            <td className="py-3 pr-4">
                              {org.posConnected ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                  {org.posProvider || 'Connected'}
                                </Badge>
                              ) : org.posProvider ? (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                                  {org.posProvider} (pending)
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">None</span>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              {orgKpi ? `${orgKpi.playbooks.active}/${orgKpi.playbooks.total}` : '—'}
                            </td>
                            <td className="py-3 pr-4">{org.customerCount}</td>
                            <td className="py-3 pr-4">
                              {org.activePromo ? (
                                <span className="text-xs">
                                  Phase {org.activePromo.currentPhase} ({org.activePromo.discountPercent}% off)
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">None</span>
                              )}
                            </td>
                            <td className="py-3">
                              {org.slug && (
                                <a
                                  href={`/dashboard/dispensary?orgId=${org.orgId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="ghost" size="sm" className="h-7 px-2">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Promo Status */}
          {promoStatus && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">NYFOUNDINGPARTNER Redemptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{promoStatus.nyfp.totalRedemptions}</span>
                    <span className="text-sm text-muted-foreground">/ {promoStatus.nyfp.maxRedemptions} slots</span>
                  </div>
                  <Progress
                    value={(promoStatus.nyfp.totalRedemptions / promoStatus.nyfp.maxRedemptions) * 100}
                    className="mt-2 h-1.5"
                  />
                  {promoStatus.nyfp.orgs.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {promoStatus.nyfp.orgs.map((o) => (
                        <div key={o.orgId} className="flex items-center justify-between text-xs">
                          <span>{o.name}</span>
                          <span className="text-muted-foreground">
                            Phase {o.currentPhase} · {o.discountPercent}% off
                            {o.daysUntilNextPhase ? ` · ${o.daysUntilNextPhase}d left` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">ALLEAVES10 Redemptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{promoStatus.alleaves.totalRedemptions}</div>
                  {promoStatus.alleaves.orgs.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {promoStatus.alleaves.orgs.map((o) => (
                        <div key={o.orgId} className="flex items-center justify-between text-xs">
                          <span>{o.name}</span>
                          <span className="text-muted-foreground">{o.activatedAt ? 'Active' : 'Pending'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ============================================================= */}
        {/* PLAYBOOKS TAB                                                   */}
        {/* ============================================================= */}
        <TabsContent value="playbooks" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Agent:</span>
            <Button
              variant={pbAgentFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              className="h-7"
              onClick={() => setPbAgentFilter('all')}
            >
              All
            </Button>
            {uniqueAgents.map((agent) => (
              <Button
                key={agent}
                variant={pbAgentFilter === agent ? 'default' : 'outline'}
                size="sm"
                className="h-7"
                onClick={() => setPbAgentFilter(agent)}
              >
                {agent}
              </Button>
            ))}
          </div>

          {/* Playbook Matrix */}
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium min-w-[200px]">Playbook</th>
                      <th className="pb-2 pr-3 font-medium">Agent</th>
                      {orgs.map((org) => (
                        <th key={org.orgId} className="pb-2 px-2 font-medium text-center min-w-[80px]" title={org.name}>
                          {org.name.slice(0, 10)}
                        </th>
                      ))}
                      <th className="pb-2 pl-4 font-medium">Batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlaybooks.map((row) => {
                      const allActive = orgs.every(o => row.orgStatuses[o.orgId] === 'active');
                      const allPausedOrUnassigned = orgs.every(o => row.orgStatuses[o.orgId] !== 'active');
                      return (
                        <tr key={row.playbookId} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 pr-4 font-medium">{row.name}</td>
                          <td className="py-2 pr-3">
                            <Badge variant="secondary" className="text-xs">{row.agent}</Badge>
                          </td>
                          {orgs.map((org) => (
                            <td key={org.orgId} className="py-2 px-2 text-center">
                              {PB_STATUS_ICON[row.orgStatuses[org.orgId] || 'unassigned']}
                            </td>
                          ))}
                          <td className="py-2 pl-4">
                            {allActive ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-amber-600"
                                onClick={() => handleBatchToggle(row.playbookId, false)}
                              >
                                <Pause className="mr-1 h-3 w-3" /> Pause All
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-green-600"
                                onClick={() => handleBatchToggle(row.playbookId, true)}
                              >
                                <Play className="mr-1 h-3 w-3" /> Activate All
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* CAMPAIGNS TAB                                                   */}
        {/* ============================================================= */}
        <TabsContent value="campaigns" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Org:</span>
            <Button
              variant={campOrgFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              className="h-7"
              onClick={() => setCampOrgFilter('all')}
            >
              All
            </Button>
            {orgs.map((org) => (
              <Button
                key={org.orgId}
                variant={campOrgFilter === org.orgId ? 'default' : 'outline'}
                size="sm"
                className="h-7"
                onClick={() => setCampOrgFilter(org.orgId)}
              >
                {org.name}
              </Button>
            ))}

            <span className="ml-4 text-sm font-medium text-muted-foreground">Status:</span>
            {['all', 'draft', 'scheduled', 'sent', 'completed'].map((s) => (
              <Button
                key={s}
                variant={campStatusFilter === s ? 'default' : 'outline'}
                size="sm"
                className="h-7"
                onClick={() => setCampStatusFilter(s)}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>

          {/* Campaign List */}
          <Card>
            <CardContent className="pt-4">
              {filteredCampaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No campaigns found. Create campaigns from individual org dashboards or the inbox.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Campaign</th>
                        <th className="pb-2 pr-4 font-medium">Org</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 pr-4 font-medium">Channels</th>
                        <th className="pb-2 pr-4 font-medium">Goal</th>
                        <th className="pb-2 pr-4 font-medium">Sent</th>
                        <th className="pb-2 pr-4 font-medium">Opened</th>
                        <th className="pb-2 font-medium">Clicked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCampaigns.map((c) => (
                        <tr key={c.id} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{c.name}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{c.orgName}</td>
                          <td className="py-2 pr-4">
                            <Badge variant="secondary">{c.status}</Badge>
                          </td>
                          <td className="py-2 pr-4">
                            {c.channels.map(ch => (
                              <Badge key={ch} variant="outline" className="mr-1 text-xs">{ch}</Badge>
                            ))}
                          </td>
                          <td className="py-2 pr-4 text-xs">{c.goal || '—'}</td>
                          <td className="py-2 pr-4">{c.performance.sent || 0}</td>
                          <td className="py-2 pr-4">{c.performance.opened || 0}</td>
                          <td className="py-2">{c.performance.clicked || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* KPIs & OKRs TAB                                                 */}
        {/* ============================================================= */}
        <TabsContent value="kpis" className="space-y-6">
          {/* Program OKRs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Program Objectives
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <OKRRow
                objective="Onboard 10 NY dispensaries"
                current={orgs.length}
                target={10}
                unit="orgs"
              />
              <OKRRow
                objective="50% POS connection rate"
                current={orgs.filter(o => o.posConnected).length}
                target={Math.ceil(orgs.length * 0.5) || 5}
                unit="connected"
              />
              <OKRRow
                objective="$500 combined MRR within 90 days"
                current={kpis?.combinedMrr ?? 0}
                target={500}
                unit="MRR"
                prefix="$"
              />
              <OKRRow
                objective="Convert 3+ Scouts to Pro"
                current={orgs.filter(o => o.planId !== 'scout').length}
                target={3}
                unit="converted"
              />
            </CardContent>
          </Card>

          {/* Per-org Health Scorecard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Per-Org Health Scorecard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Dispensary</th>
                      <th className="pb-2 px-2 font-medium text-center">POS</th>
                      <th className="pb-2 px-2 font-medium text-center">Playbooks</th>
                      <th className="pb-2 px-2 font-medium text-center">Campaigns</th>
                      <th className="pb-2 px-2 font-medium text-center">Customers</th>
                      <th className="pb-2 px-2 font-medium text-center">Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((org) => {
                      const orgKpi = kpis?.orgs.find(k => k.orgId === org.orgId);
                      return (
                        <tr key={org.orgId} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{org.name}</td>
                          <td className="py-2 px-2 text-center">
                            <HealthDot ok={org.posConnected} />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <HealthDot ok={(orgKpi?.playbooks.active ?? 0) > 0} warn={(orgKpi?.playbooks.active ?? 0) > 0 && (orgKpi?.playbooks.active ?? 0) < 5} />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <HealthDot ok={(orgKpi?.campaigns.sent ?? 0) > 0} />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <HealthDot ok={org.customerCount > 0} />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Badge variant="outline" className="text-xs">
                              {org.planId}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          {kpis && (
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Total Customers (all orgs)</div>
                  <div className="text-2xl font-bold mt-1">
                    {kpis.orgs.reduce((sum, o) => sum + o.customers.total, 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Total Campaigns Sent</div>
                  <div className="text-2xl font-bold mt-1">
                    {kpis.orgs.reduce((sum, o) => sum + o.campaigns.sent, 0)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">Total Active Playbooks</div>
                  <div className="text-2xl font-bold mt-1">
                    {kpis.orgs.reduce((sum, o) => sum + o.playbooks.active, 0)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OKRRow({
  objective,
  current,
  target,
  unit,
  prefix = '',
}: {
  objective: string;
  current: number;
  target: number;
  unit: string;
  prefix?: string;
}) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const isGreen = pct >= 80;
  const isYellow = pct >= 40 && pct < 80;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{objective}</span>
        <span className="text-sm">
          {prefix}{current} / {prefix}{target} {unit}
          <span className={`ml-2 text-xs ${isGreen ? 'text-green-600' : isYellow ? 'text-amber-600' : 'text-red-500'}`}>
            ({pct}%)
          </span>
        </span>
      </div>
      <Progress
        value={pct}
        className={`h-2 ${isGreen ? '[&>div]:bg-green-500' : isYellow ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`}
      />
    </div>
  );
}

function HealthDot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok && !warn) {
    return <span className="inline-block h-3 w-3 rounded-full bg-green-500" title="Good" />;
  }
  if (warn) {
    return <span className="inline-block h-3 w-3 rounded-full bg-amber-400" title="Needs attention" />;
  }
  return <span className="inline-block h-3 w-3 rounded-full bg-red-400" title="Not set up" />;
}
