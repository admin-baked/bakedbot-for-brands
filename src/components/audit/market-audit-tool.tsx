'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, AlertTriangle, TrendingUp, Zap, CheckSquare } from 'lucide-react';
import { runMarketAudit } from '@/server/actions/market-audit';
import type { MarketAuditResult } from '@/server/actions/market-audit';
import { DIMENSION_LABELS, ScoreBar } from '@/components/audit/audit-lead-flow';

function SeverityBadge({ severity }: { severity: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const cls = severity === 'HIGH'
    ? 'bg-red-100 text-red-700 border-red-200'
    : severity === 'MEDIUM'
    ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
    : 'bg-blue-100 text-blue-700 border-blue-200';
  return <Badge variant="outline" className={cls}>{severity}</Badge>;
}

function GradeCircle({ grade, score }: { grade: string; score: number }) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
  return (
    <div className="flex flex-col items-center">
      <div className={`text-6xl font-bold ${color}`}>{grade}</div>
      <div className="text-2xl font-semibold text-muted-foreground">{score}/100</div>
    </div>
  );
}

export function MarketAuditTool() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAudit() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await runMarketAudit(url.trim());
    if ('error' in res) {
      setError(res.error);
    } else {
      setResult(res);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* URL input */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Audit</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter any website URL for a full AI-powered marketing analysis — content, conversion, SEO, competitive positioning, and compliance.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://dispensaryname.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleAudit()}
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={handleAudit} disabled={loading || !url.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {loading ? 'Analyzing...' : 'Run Audit'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Overall score */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <GradeCircle grade={result.grade} score={result.overallScore} />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{result.url}</p>
                  <p className="text-base">{result.summary}</p>
                  {result.technicalData && (
                    <div className="flex gap-4 pt-2 text-xs text-muted-foreground">
                      <span>Speed: {result.technicalData.performance}/100</span>
                      <span>SEO Score: {result.technicalData.seo}/100</span>
                      <span>FCP: {result.technicalData.fcp}</span>
                      <span>LCP: {result.technicalData.lcp}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dimension scores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dimension Scores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(result.dimensions).map(([key, dim]) => (
                <div key={key} className="space-y-1">
                  <ScoreBar score={dim.score} max={dim.max} label={DIMENSION_LABELS[key] ?? key} />
                  <p className="text-xs text-muted-foreground pl-0.5">{dim.findings}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Revenue leaks */}
          {result.revenueLeaks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-red-500" />
                  Revenue Leaks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.revenueLeaks.map((leak, i) => (
                  <div key={i} className="border-l-2 border-red-300 pl-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{leak.title}</span>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="secondary">{leak.effort} effort</Badge>
                        <span className="text-green-600 font-medium">{leak.impactMonthly}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{leak.why}</p>
                    <p className="text-xs font-medium">Fix: {leak.fix}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick wins + compliance side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.quickWins.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    Quick Wins
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.quickWins.map((win, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckSquare className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{win}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {result.complianceFlags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Compliance Flags
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.complianceFlags.map((flag, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={flag.severity} />
                        <span className="text-sm font-medium">{flag.issue}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{flag.fix}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Copy rewrites */}
          {result.copyRewrites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Copy Rewrites</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.copyRewrites.map((rw, i) => (
                  <div key={i} className="space-y-1 text-sm">
                    <div className="bg-red-50 border border-red-100 rounded px-3 py-2 text-red-700 line-through">
                      {rw.before}
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded px-3 py-2 text-green-700">
                      {rw.after}
                    </div>
                    <p className="text-xs text-muted-foreground px-1">{rw.why}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* A/B tests */}
          {result.abTests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">A/B Tests to Run</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.abTests.map((test, i) => (
                  <div key={i} className="border rounded p-3 text-sm space-y-1">
                    <p>{test.hypothesis}</p>
                    <p className="text-xs text-muted-foreground">Metric: {test.metric}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
