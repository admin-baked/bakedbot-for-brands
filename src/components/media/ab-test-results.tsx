'use client';

/**
 * A/B Test Results Dashboard
 *
 * Displays results for a media A/B test with:
 * - Variant comparison table
 * - Key metrics (CTR, CVR, Cost)
 * - Winner badge
 * - Confidence levels
 */

import { useEffect, useState } from 'react';
import { MediaABTest, MediaABTestResult } from '@/types/media-generation';
import { getMediaABTestResults } from '@/server/actions/style-presets';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ABTestResultsProps {
  tenantId: string;
  test: MediaABTest;
}

export function ABTestResults({ tenantId, test }: ABTestResultsProps) {
  const [results, setResults] = useState<MediaABTestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [test.id]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await getMediaABTestResults(tenantId, test.id);
      setResults(data);
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Results Yet</CardTitle>
          <CardDescription>
            Generate media for each variant and start tracking metrics to see results here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const winner = results.find((r) => r.isWinner);
  const sortedResults = [...results].sort((a, b) => {
    // Sort by CTR descending
    return b.ctr - a.ctr;
  });

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatNumber = (value: number) => value.toLocaleString();

  const getVariantName = (variantId: string) => {
    const variant = test.variants.find((v) => v.id === variantId);
    return variant?.name || variantId;
  };

  const compareToWinner = (value: number, winnerValue: number) => {
    if (!winner || value === winnerValue) return null;
    const diff = ((value - winnerValue) / winnerValue) * 100;
    if (Math.abs(diff) < 1) return null;
    return diff;
  };

  return (
    <div className="space-y-6">
      {/* Winner Banner */}
      {winner && test.status === 'completed' && (
        <Card className="bg-primary/5 border-primary">
          <CardContent className="flex items-center gap-3 pt-6">
            <Trophy className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold">Winner: {getVariantName(winner.variantId)}</p>
              <p className="text-sm text-muted-foreground">
                {formatPercent(winner.ctr)} CTR • {formatPercent(winner.cvr)} CVR
                {winner.confidence && ` • ${Math.round(winner.confidence * 100)}% confidence`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Variant Performance</CardTitle>
          <CardDescription>
            Comparing {results.length} variants across {test.metrics.join(', ')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                {test.metrics.includes('impressions') && <TableHead>Impressions</TableHead>}
                {test.metrics.includes('clicks') && (
                  <>
                    <TableHead>Clicks</TableHead>
                    <TableHead>CTR</TableHead>
                  </>
                )}
                {test.metrics.includes('conversions') && (
                  <>
                    <TableHead>Conversions</TableHead>
                    <TableHead>CVR</TableHead>
                  </>
                )}
                {test.metrics.includes('engagement') && (
                  <>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Eng. Rate</TableHead>
                  </>
                )}
                {test.metrics.includes('cost') && (
                  <>
                    <TableHead>Cost</TableHead>
                    <TableHead>CPC</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedResults.map((result) => {
                const isWinner = result.isWinner;
                const ctrDiff = winner ? compareToWinner(result.ctr, winner.ctr) : null;
                const cvrDiff = winner ? compareToWinner(result.cvr, winner.cvr) : null;

                return (
                  <TableRow key={result.variantId} className={isWinner ? 'bg-primary/5' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {getVariantName(result.variantId)}
                        {isWinner && (
                          <Badge variant="default" className="text-xs">
                            Winner
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {test.metrics.includes('impressions') && (
                      <TableCell>{formatNumber(result.impressions)}</TableCell>
                    )}

                    {test.metrics.includes('clicks') && (
                      <>
                        <TableCell>{formatNumber(result.clicks)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {formatPercent(result.ctr)}
                            {ctrDiff !== null && (
                              <span
                                className={`text-xs flex items-center ${
                                  ctrDiff > 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {ctrDiff > 0 ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {Math.abs(ctrDiff).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </>
                    )}

                    {test.metrics.includes('conversions') && (
                      <>
                        <TableCell>{formatNumber(result.conversions)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {formatPercent(result.cvr)}
                            {cvrDiff !== null && (
                              <span
                                className={`text-xs flex items-center ${
                                  cvrDiff > 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {cvrDiff > 0 ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {Math.abs(cvrDiff).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </>
                    )}

                    {test.metrics.includes('engagement') && (
                      <>
                        <TableCell>{formatNumber(result.engagement)}</TableCell>
                        <TableCell>{formatPercent(result.engagementRate)}</TableCell>
                      </>
                    )}

                    {test.metrics.includes('cost') && (
                      <>
                        <TableCell>{formatCurrency(result.costUsd)}</TableCell>
                        <TableCell>{formatCurrency(result.cpc)}</TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {test.metrics.includes('clicks') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Best CTR</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatPercent(Math.max(...results.map((r) => r.ctr)))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {getVariantName(
                  results.find((r) => r.ctr === Math.max(...results.map((r2) => r2.ctr)))
                    ?.variantId || ''
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {test.metrics.includes('conversions') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Best CVR</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatPercent(Math.max(...results.map((r) => r.cvr)))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {getVariantName(
                  results.find((r) => r.cvr === Math.max(...results.map((r2) => r2.cvr)))
                    ?.variantId || ''
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {test.metrics.includes('cost') && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Lowest CPC</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  Math.min(...results.filter((r) => r.cpc > 0).map((r) => r.cpc))
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {getVariantName(
                  results.find(
                    (r) =>
                      r.cpc ===
                      Math.min(...results.filter((r2) => r2.cpc > 0).map((r2) => r2.cpc))
                  )?.variantId || ''
                )}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
