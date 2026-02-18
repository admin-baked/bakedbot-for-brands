'use client';

/**
 * Admin - Playbook Templates Dashboard
 *
 * View all seeded tier playbook templates, their assignments, and execution stats
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Loader2, RefreshCw, Download } from 'lucide-react';
import { getPlaybookTemplateStats } from '@/server/actions/playbook-template-admin';

interface TemplateStats {
  templateId: string;
  templateName: string;
  tier: string;
  assignedCount: number;
  executedCount: number;
  successRate: number;
  lastExecuted?: string;
  activePlaybooks: number;
  failureCount: number;
}

interface TierStats {
  tier: string;
  templateCount: number;
  totalAssigned: number;
  avgSuccessRate: number;
}

export default function PlaybookTemplatesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateStats[]>([]);
  const [tierStats, setTierStats] = useState<TierStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [reseeding, setReseeding] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!authLoading && user) {
      loadStats();
    }
  }, [authLoading, user]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const stats = await getPlaybookTemplateStats();

      if ('error' in stats) {
        toast({
          title: 'Error Loading Stats',
          description: stats.error,
          variant: 'destructive',
        });
        return;
      }

      setTemplates(stats.templates);
      setTierStats(stats.tierStats);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load stats',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReseed = async () => {
    try {
      setReseeding(true);
      const response = await fetch('/api/admin/seed-playbooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reseed templates');
      }

      const result = await response.json();

      toast({
        title: 'Seeding Complete',
        description: `Seeded: ${result.seeded.length}, Skipped: ${result.skipped.length}, Failed: ${result.failed.length}`,
      });

      // Reload stats
      await loadStats();
    } catch (err) {
      toast({
        title: 'Seeding Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setReseeding(false);
    }
  };

  const handleExportStats = () => {
    const csv = [
      ['Template ID', 'Name', 'Tier', 'Assigned', 'Executed', 'Success Rate', 'Active', 'Failures'],
      ...templates.map((t) => [
        t.templateId,
        t.templateName,
        t.tier,
        t.assignedCount,
        t.executedCount,
        `${t.successRate.toFixed(1)}%`,
        t.activePlaybooks,
        t.failureCount,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playbook-templates-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const tierChartData = tierStats.map((t) => ({
    tier: t.tier.charAt(0).toUpperCase() + t.tier.slice(1),
    templates: t.templateCount,
    assigned: t.totalAssigned,
    avgSuccess: Math.round(t.avgSuccessRate),
  }));

  const successRateData = templates.map((t) => ({
    name: t.templateName,
    success: t.successRate,
    failure: 100 - t.successRate,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Playbook Templates</h1>
          <div className="flex gap-2">
            <Button
              onClick={handleExportStats}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={handleReseed}
              disabled={reseeding}
              className="gap-2"
            >
              {reseeding && <Loader2 className="w-4 h-4 animate-spin" />}
              <RefreshCw className="w-4 h-4" />
              Reseed Templates
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Manage tier-based playbook templates, view assignments, and monitor execution stats
        </p>
      </div>

      {/* Tier Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {tierStats.map((tier) => (
          <Card key={tier.tier}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium capitalize">
                {tier.tier}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Templates</p>
                <p className="text-2xl font-bold">{tier.templateCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Assigned</p>
                <p className="text-xl font-semibold">{tier.totalAssigned}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Success</p>
                <p className="text-lg font-semibold text-green-600">
                  {tier.avgSuccessRate.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Templates by Tier</CardTitle>
              <CardDescription>
                Distribution of templates across subscription tiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tierChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tier" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="templates" fill="#3b82f6" name="Total Templates" />
                  <Bar dataKey="assigned" fill="#10b981" name="Assigned to Orgs" />
                  <Bar dataKey="avgSuccess" fill="#8b5cf6" name="Avg Success Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Templates Seeded</p>
                <p className="text-3xl font-bold">{templates.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Assignments</p>
                <p className="text-3xl font-bold">
                  {templates.reduce((sum, t) => sum + t.assignedCount, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Executions</p>
                <p className="text-3xl font-bold">
                  {templates.reduce((sum, t) => sum + t.executedCount, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Overall Success Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {templates.length > 0
                    ? (
                        templates.reduce((sum, t) => sum + t.successRate, 0) / templates.length
                      ).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>All Seeded Templates</CardTitle>
              <CardDescription>
                View details of each playbook template and its tier assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                    <TableHead className="text-right">Executed</TableHead>
                    <TableHead className="text-right">Success Rate</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                    <TableHead className="text-right">Failures</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow
                      key={template.templateId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/admin/playbook-templates/${template.templateId}`)}
                    >
                      <TableCell className="font-mono text-sm">
                        {template.templateId}
                      </TableCell>
                      <TableCell className="font-medium text-blue-600 hover:underline">
                        {template.templateName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            template.tier === 'pro'
                              ? 'default'
                              : template.tier === 'enterprise'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {template.tier}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{template.assignedCount}</TableCell>
                      <TableCell className="text-right">{template.executedCount}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            template.successRate >= 95
                              ? 'text-green-600 font-semibold'
                              : template.successRate >= 80
                                ? 'text-yellow-600 font-semibold'
                                : 'text-red-600 font-semibold'
                          }
                        >
                          {template.successRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{template.activePlaybooks}</TableCell>
                      <TableCell className="text-right">
                        {template.failureCount > 0 && (
                          <span className="text-red-600 font-semibold">{template.failureCount}</span>
                        )}
                        {template.failureCount === 0 && (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Success Rates by Template</CardTitle>
              <CardDescription>
                Success vs failure rate for each template's executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={successRateData}
                  layout="vertical"
                  margin={{ left: 200, right: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={200} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="success" fill="#10b981" name="Success %" />
                  <Bar dataKey="failure" fill="#ef4444" name="Failure %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
