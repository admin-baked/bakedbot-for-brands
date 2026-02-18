'use client';

/**
 * Template Drill-Down Page
 *
 * View detailed execution history, org assignments, and performance timeline for a specific template
 */

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Loader2, ArrowLeft, Calendar } from 'lucide-react';
import {
  getTemplateDrilldown,
  type TemplateDetails,
  type OrgAssignment,
  type ExecutionRecord,
  type TemplateExecutionTimeline,
} from '@/server/actions/playbook-template-drilldown';

export default function TemplateDrilldownPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const templateId = params.templateId as string;

  const [template, setTemplate] = useState<TemplateDetails | null>(null);
  const [orgAssignments, setOrgAssignments] = useState<OrgAssignment[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<ExecutionRecord[]>([]);
  const [timeline, setTimeline] = useState<TemplateExecutionTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orgs');

  useEffect(() => {
    if (!authLoading && user) {
      loadDrilldown();
    }
  }, [authLoading, user, templateId]);

  const loadDrilldown = async () => {
    try {
      setLoading(true);
      const result = await getTemplateDrilldown(templateId);

      if ('error' in result) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      setTemplate(result.template);
      setOrgAssignments(result.orgAssignments);
      setRecentExecutions(result.recentExecutions);
      setTimeline(result.timeline);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <p className="text-muted-foreground">Template not found</p>
      </div>
    );
  }

  const totalAssigned = orgAssignments.length;
  const totalExecutions = orgAssignments.reduce((sum, o) => sum + o.executionCount, 0);
  const totalSuccesses = orgAssignments.reduce((sum, o) => sum + o.successCount, 0);
  const overallSuccessRate = totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="w-fit gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Templates
        </Button>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{template.name}</h1>
            <Badge variant="secondary">{template.tier}</Badge>
          </div>
          {template.description && (
            <p className="text-muted-foreground">{template.description}</p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Orgs Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalAssigned}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalExecutions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{totalSuccesses}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {overallSuccessRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orgs">Assigned Orgs</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="recent">Recent Executions</TabsTrigger>
        </TabsList>

        {/* Orgs Tab */}
        <TabsContent value="orgs">
          <Card>
            <CardHeader>
              <CardTitle>Organizations Using This Template</CardTitle>
              <CardDescription>
                Performance metrics for each org that has this template assigned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-right">Executions</TableHead>
                    <TableHead className="text-right">Success</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead className="text-right">Success Rate</TableHead>
                    <TableHead>Last Executed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgAssignments.map((org) => (
                    <TableRow key={org.orgId}>
                      <TableCell className="font-medium">{org.orgName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            org.status === 'active'
                              ? 'default'
                              : org.status === 'paused'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {org.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(org.assignedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">{org.executionCount}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        {org.successCount}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-semibold">
                        {org.failureCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            org.successRate >= 95
                              ? 'text-green-600 font-semibold'
                              : org.successRate >= 80
                                ? 'text-yellow-600 font-semibold'
                                : 'text-red-600 font-semibold'
                          }
                        >
                          {org.successRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {org.lastExecutedAt
                          ? new Date(org.lastExecutedAt).toLocaleDateString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>30-Day Execution Timeline</CardTitle>
              <CardDescription>
                Daily execution count and success rate over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'successRate') return `${(value as number).toFixed(1)}%`;
                        return value;
                      }}
                      labelFormatter={(date) =>
                        new Date(date as string).toLocaleDateString()
                      }
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="executions"
                      stroke="#3b82f6"
                      name="Executions"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="successful"
                      stroke="#10b981"
                      name="Successful"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="failed"
                      stroke="#ef4444"
                      name="Failed"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="successRate"
                      stroke="#8b5cf6"
                      name="Success Rate %"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">No execution data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Executions Tab */}
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions (Last 100)</CardTitle>
              <CardDescription>
                Latest execution records across all organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Steps</TableHead>
                    <TableHead className="text-right">Retries</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentExecutions.length > 0 ? (
                    recentExecutions.map((exec) => (
                      <TableRow key={exec.executionId}>
                        <TableCell className="font-medium text-sm">{exec.orgName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              exec.status === 'completed' || exec.status === 'success'
                                ? 'default'
                                : exec.status === 'pending'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {exec.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(exec.startedAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {exec.duration ? `${(exec.duration / 1000).toFixed(1)}s` : '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {exec.successfulSteps}/{exec.totalSteps}
                        </TableCell>
                        <TableCell className="text-right">
                          {exec.retryCount > 0 && (
                            <span className="text-yellow-600 font-semibold">
                              {exec.retryCount}
                            </span>
                          )}
                          {exec.retryCount === 0 && (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-red-600 max-w-xs truncate">
                          {exec.errorMessage || '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No execution records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
