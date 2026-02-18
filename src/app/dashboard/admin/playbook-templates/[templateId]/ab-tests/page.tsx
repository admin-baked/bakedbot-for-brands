'use client';

/**
 * A/B Test Dashboard
 *
 * Compare template variants and track which performs best
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
  LineChart,
  Line,
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
import { Loader2, ArrowLeft, TrendingUp } from 'lucide-react';
import {
  getABTestResults,
  completeABTest,
} from '@/server/actions/playbook-ab-testing';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function ABTestDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const templateId = params.templateId as string;

  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      loadResults();
    }
  }, [authLoading, user, templateId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const result = await getABTestResults(templateId);

      if ('error' in result) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      setTestResults(result);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load test',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTest = async () => {
    try {
      setCompleting(true);
      const result = await completeABTest(templateId);

      if ('error' in result) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Test Completed',
        description: result.message,
      });

      await loadResults();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to complete test',
        variant: 'destructive',
      });
    } finally {
      setCompleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!testResults || testResults.variants.length === 0) {
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
        <Card>
          <CardHeader>
            <CardTitle>No Active A/B Test</CardTitle>
            <CardDescription>
              Create an A/B test to compare template variants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              To start an A/B test, you need to create template variants and call the
              <code className="bg-muted px-2 py-1 rounded">createABTest()</code> API.
            </p>
            <Button onClick={() => router.back()}>Back to Template</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const variants = testResults.variants || [];
  const isCompleted = testResults.testStatus === 'completed';
  const winner = variants.find((v: any) => v.winner);

  // Prepare chart data
  const comparisonData = variants.map((v: any) => ({
    name: v.variantName,
    success: v.successRate,
    failure: 100 - v.successRate,
  }));

  const executionData = variants.map((v: any) => ({
    name: v.variantName,
    executions: v.totalExecutions,
    successful: v.successfulExecutions,
    failed: v.failedExecutions,
  }));

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
          Back to Template
        </Button>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">A/B Test Results</h1>
              <p className="text-muted-foreground mt-1">
                Template: {templateId}
              </p>
            </div>
            <Badge
              variant={isCompleted ? 'secondary' : 'default'}
              className="text-lg px-4 py-2"
            >
              {testResults.testStatus === 'running'
                ? '🔴 Running'
                : '🟢 Completed'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Winner Card */}
      {isCompleted && winner && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-green-900">Winner Declared</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Winning Variant</p>
                <p className="text-2xl font-bold text-green-700">{winner.variantName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-700">
                  {winner.successRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Executions</p>
                <p className="text-2xl font-bold text-green-700">
                  {winner.totalExecutions}
                </p>
              </div>
            </div>
            <p className="text-sm text-green-900">
              This variant showed the best performance. Consider promoting it to all new
              organizations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Test Status & Action */}
      {!isCompleted && (
        <Card>
          <CardHeader>
            <CardTitle>Test In Progress</CardTitle>
            <CardDescription>
              Monitoring variant performance. Ready to declare a winner?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {variants.map((v: any, idx: number) => (
                <div key={idx} className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold text-sm mb-2">{v.variantName}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {v.successRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {v.totalExecutions} executions
                  </p>
                </div>
              ))}
            </div>
            <Button
              onClick={handleCompleteTest}
              disabled={completing}
              className="w-full"
              size="lg"
            >
              {completing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Complete Test & Declare Winner
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Comparison Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Success Rate Comparison</CardTitle>
          <CardDescription>
            Percentage of successful executions per variant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="success" fill="#10b981" name="Success %" />
              <Bar dataKey="failure" fill="#ef4444" name="Failure %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Execution Volume */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Volume</CardTitle>
          <CardDescription>
            Total executions and success breakdown per variant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={executionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="successful" fill="#10b981" name="Successful" />
              <Bar dataKey="failed" fill="#ef4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Variant Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Variant Details</CardTitle>
          <CardDescription>
            Detailed performance metrics for each variant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">Executions</TableHead>
                <TableHead className="text-right">Successful</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Success Rate</TableHead>
                <TableHead className="text-right">Avg Time</TableHead>
                <TableHead>Assigned Orgs</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{variant.variantName}</TableCell>
                  <TableCell className="text-right">{variant.totalExecutions}</TableCell>
                  <TableCell className="text-right text-green-600 font-semibold">
                    {variant.successfulExecutions}
                  </TableCell>
                  <TableCell className="text-right text-red-600 font-semibold">
                    {variant.failedExecutions}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-lg font-bold text-blue-600">
                      {variant.successRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {(variant.avgExecutionTime / 1000).toFixed(2)}s
                  </TableCell>
                  <TableCell>{variant.assignedOrgs}</TableCell>
                  <TableCell>
                    {variant.winner && (
                      <Badge className="bg-green-500">🏆 Winner</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isCompleted ? (
            <>
              <p>
                ✅ <strong>{winner?.variantName}</strong> is the winner with{' '}
                <strong>{winner?.successRate.toFixed(1)}%</strong> success rate.
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Update all new customers to use this variant</li>
                <li>Consider migrating existing customers to the winning variant</li>
                <li>Archive the losing variants if no longer needed</li>
                <li>Document the results for future reference</li>
              </ul>
            </>
          ) : (
            <>
              <p>
                Test is currently running. The system is monitoring variant performance.
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Allow 7-14 days for statistically significant results</li>
                <li>Monitor success rates daily in this dashboard</li>
                <li>When ready, click "Complete Test & Declare Winner"</li>
                <li>Winner will be recommended for all future assignments</li>
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
