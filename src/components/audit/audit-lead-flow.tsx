'use client';

/**
 * AuditLeadFlow
 *
 * Reusable URL → AI analyze → teaser → email gate → full report flow.
 * Used by both the homepage popup and the /free-audit standalone page.
 *
 * UTM params are read from the browser URL and passed to the CRM on lead submit.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  ChevronRight,
  Lock,
  Loader2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { runMarketAudit, submitMarketAuditLead } from '@/server/actions/market-audit';
import type { MarketAuditResult } from '@/server/actions/market-audit';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'url' | 'loading' | 'teaser' | 'unlocked';

interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

export interface AuditLeadFlowProps {
  initialUrl?: string;
  utm?: UtmParams;
  onClose?: () => void;
  /** If true, renders compact (for popup use). Default: false (full page) */
  compact?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const DIMENSION_LABELS: Record<string, string> = {
  content: 'Content & Messaging',
  conversion: 'Conversion & Trust',
  seo: 'SEO & Discoverability',
  competitive: 'Competitive Positioning',
  compliance: 'Compliance & Fidelity',
};

function gradeColor(grade: string) {
  const map: Record<string, string> = {
    A: 'text-green-600',
    B: 'text-emerald-600',
    C: 'text-yellow-600',
    D: 'text-orange-600',
    F: 'text-red-600',
  };
  return map[grade] ?? 'text-muted-foreground';
}

export function ScoreBar({ score, max, label, blurred }: { score: number; max: number; label: string; blurred?: boolean }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className={`space-y-1 ${blurred ? 'select-none' : ''}`}>
      <div className="flex justify-between text-sm">
        <span className={`text-muted-foreground ${blurred ? 'blur-sm' : ''}`}>{label}</span>
        <span className={`font-medium tabular-nums ${blurred ? 'blur-sm' : ''}`}>{score}/{max}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} ${blurred ? 'opacity-30' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function readUtmFromBrowser(): UtmParams {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  return {
    source: p.get('utm_source') ?? undefined,
    medium: p.get('utm_medium') ?? undefined,
    campaign: p.get('utm_campaign') ?? undefined,
    content: p.get('utm_content') ?? undefined,
  };
}

// ── Loading messages ──────────────────────────────────────────────────────────

const LOADING_STEPS = [
  'Fetching your website...',
  'Analyzing content & messaging...',
  'Scoring conversion & trust signals...',
  'Checking SEO & discoverability...',
  'Assessing compliance & fidelity...',
  'Generating revenue recommendations...',
];

function LoadingAnimation() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => Math.min(i + 1, LOADING_STEPS.length - 1)), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-emerald-500/20 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-medium">{LOADING_STEPS[idx]}</p>
        <p className="text-xs text-muted-foreground">AI analyzing 5 marketing dimensions</p>
      </div>
      <div className="flex gap-1">
        {LOADING_STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${i <= idx ? 'w-6 bg-emerald-500' : 'w-2 bg-muted'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AuditLeadFlow({ initialUrl = '', utm: utmProp, onClose, compact = false }: AuditLeadFlowProps) {
  const [step, setStep] = useState<Step>(initialUrl ? 'loading' : 'url');
  const [url, setUrl] = useState(initialUrl);
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [audit, setAudit] = useState<MarketAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Gate form
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  const utmRef = useRef<UtmParams>(utmProp ?? {});
  useEffect(() => {
    if (!utmProp) utmRef.current = readUtmFromBrowser();
  }, [utmProp]);

  // Auto-run once on mount if initialUrl supplied (intentional single-fire, not reactive to prop changes)
  const didAutoRun = useRef(false);
  useEffect(() => {
    if (initialUrl?.trim() && !didAutoRun.current) {
      didAutoRun.current = true;
      runAudit(initialUrl.trim());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only
  }, []);

  async function runAudit(targetUrl: string) {
    setStep('loading');
    setError(null);
    const result = await runMarketAudit(targetUrl);
    if ('error' in result) {
      setError(result.error);
      setStep('url');
    } else {
      setAudit(result);
      setStep('teaser');
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setUrl(urlInput.trim());
    await runAudit(urlInput.trim());
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !audit) return;
    setSubmitting(true);
    setGateError(null);
    const result = await submitMarketAuditLead({
      url,
      email: email.trim(),
      firstName: firstName.trim() || undefined,
      marketingConsent,
      auditResult: audit,
      utmSource: utmRef.current.source,
      utmMedium: utmRef.current.medium,
      utmCampaign: utmRef.current.campaign,
      utmContent: utmRef.current.content,
    });
    setSubmitting(false);
    if (!result.success) {
      setGateError(result.error ?? 'Something went wrong. Please try again.');
    } else {
      setStep('unlocked');
    }
  }

  // ── Step: URL input ──────────────────────────────────────────────────────────

  if (step === 'url') {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Free Marketing Audit</h2>
          <p className="text-sm text-muted-foreground">
            Enter your dispensary or brand website. Our AI analyzes 5 marketing dimensions in ~20 seconds.
          </p>
        </div>
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <Input
            placeholder="https://dispensaryname.com"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={!urlInput.trim()}>
            Analyze
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </form>
        <p className="text-xs text-center text-muted-foreground">
          No account needed. Free forever. Results in ~20 seconds.
        </p>
      </div>
    );
  }

  // ── Step: Loading ────────────────────────────────────────────────────────────

  if (step === 'loading') {
    return <LoadingAnimation />;
  }

  if (!audit) return null;

  // ── Step: Teaser + Email Gate ─────────────────────────────────────────────────

  if (step === 'teaser') {
    const dimEntries = Object.entries(audit.dimensions);
    const topLeak = audit.revenueLeaks[0];

    return (
      <div className="space-y-5">
        {/* Score header */}
        <div className="flex items-center gap-4 pb-4 border-b">
          <div className="text-center">
            <div className={`text-5xl font-bold ${gradeColor(audit.grade)}`}>{audit.grade}</div>
            <div className="text-lg font-semibold text-muted-foreground">{audit.overallScore}/100</div>
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">{url}</p>
            <p className="text-sm leading-snug">{audit.summary}</p>
          </div>
        </div>

        {/* Dimension scores — first 2 visible, rest blurred */}
        <div className="space-y-3">
          {dimEntries.map(([key, dim], i) => (
            <ScoreBar
              key={key}
              score={dim.score}
              max={dim.max}
              label={DIMENSION_LABELS[key] ?? key}
              blurred={i >= 2}
            />
          ))}
        </div>

        {/* Top revenue leak */}
        {topLeak && (
          <div className="border-l-2 border-red-300 pl-3 space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-red-500" />
              <span className="text-sm font-medium">{topLeak.title}</span>
              <Badge variant="secondary" className="text-xs">{topLeak.effort}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{topLeak.why}</p>
          </div>
        )}

        {/* Lock banner */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Full report includes:
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            {[
              'All 5 dimension breakdowns + findings',
              `${audit.revenueLeaks.length} revenue leaks with fix estimates`,
              'Before/after copy rewrites',
              `${audit.complianceFlags.length} compliance flags${audit.complianceFlags.some(f => f.severity === 'HIGH') ? ' (including HIGH severity)' : ''}`,
              'A/B test hypotheses to run',
            ].map(item => (
              <li key={item} className="flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          {/* Email gate form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3 pt-2 border-t border-border/50">
            <p className="text-xs font-medium">Get your full report — free</p>
            <div className="flex gap-2">
              <Input
                placeholder="First name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-28 text-sm h-9"
              />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="flex-1 text-sm h-9"
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="mkt-consent"
                checked={marketingConsent}
                onCheckedChange={v => setMarketingConsent(!!v)}
                className="mt-0.5"
              />
              <Label htmlFor="mkt-consent" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                Send me marketing tips and BakedBot updates. Unsubscribe anytime.
              </Label>
            </div>
            {gateError && <p className="text-xs text-red-600">{gateError}</p>}
            <Button type="submit" disabled={submitting || !email.trim()} className="w-full h-9">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {submitting ? 'Saving your report...' : 'Unlock Full Report'}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              No spam. No credit card. Just your audit results.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ── Step: Unlocked full results ───────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Score */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="text-center">
          <div className={`text-5xl font-bold ${gradeColor(audit.grade)}`}>{audit.grade}</div>
          <div className="text-lg font-semibold text-muted-foreground">{audit.overallScore}/100</div>
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">{url}</p>
          <p className="text-sm leading-snug">{audit.summary}</p>
          {firstName && (
            <p className="text-xs text-emerald-600 mt-1 font-medium">
              Your full report is ready{firstName ? `, ${firstName}` : ''}.
            </p>
          )}
        </div>
      </div>

      {/* All dimension scores */}
      <div className="space-y-3">
        {Object.entries(audit.dimensions).map(([key, dim]) => (
          <div key={key} className="space-y-1">
            <ScoreBar score={dim.score} max={dim.max} label={DIMENSION_LABELS[key] ?? key} />
            <p className="text-xs text-muted-foreground pl-0.5 leading-snug">{dim.findings}</p>
          </div>
        ))}
      </div>

      {/* Revenue leaks */}
      {audit.revenueLeaks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-red-500" />
            Revenue Leaks
          </h3>
          {audit.revenueLeaks.map((leak, i) => (
            <div key={i} className="border-l-2 border-red-300 pl-3 space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-medium">{leak.title}</span>
                <div className="flex gap-2 text-xs items-center">
                  <Badge variant="secondary">{leak.effort} effort</Badge>
                  <span className="text-green-600 font-medium">{leak.impactMonthly}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{leak.why}</p>
              <p className="text-xs font-medium">Fix: {leak.fix}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick wins */}
      {audit.quickWins.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-yellow-500" />
            Quick Wins
          </h3>
          {audit.quickWins.map((win, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <CheckSquare className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>{win}</span>
            </div>
          ))}
        </div>
      )}

      {/* Compliance flags */}
      {audit.complianceFlags.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Compliance Flags
          </h3>
          {audit.complianceFlags.map((flag, i) => (
            <div key={i} className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    flag.severity === 'HIGH'
                      ? 'bg-red-100 text-red-700 border-red-200 text-xs'
                      : flag.severity === 'MEDIUM'
                      ? 'bg-yellow-100 text-yellow-700 border-yellow-200 text-xs'
                      : 'bg-blue-100 text-blue-700 border-blue-200 text-xs'
                  }
                >
                  {flag.severity}
                </Badge>
                <span className="text-xs font-medium">{flag.issue}</span>
              </div>
              <p className="text-xs text-muted-foreground pl-1">{flag.fix}</p>
            </div>
          ))}
        </div>
      )}

      {/* Copy rewrites */}
      {audit.copyRewrites.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Copy Rewrites</h3>
          {audit.copyRewrites.map((rw, i) => (
            <div key={i} className="space-y-1 text-xs">
              <div className="bg-red-50 border border-red-100 rounded px-2.5 py-1.5 text-red-700 line-through">{rw.before}</div>
              <div className="bg-green-50 border border-green-100 rounded px-2.5 py-1.5 text-green-700">{rw.after}</div>
              <p className="text-muted-foreground px-0.5">{rw.why}</p>
            </div>
          ))}
        </div>
      )}

      {/* A/B tests */}
      {audit.abTests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">A/B Tests to Run</h3>
          {audit.abTests.map((test, i) => (
            <div key={i} className="border rounded p-2.5 text-xs space-y-0.5">
              <p>{test.hypothesis}</p>
              <p className="text-muted-foreground">Metric: {test.metric}</p>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="pt-4 border-t">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center space-y-2">
          <p className="text-sm font-semibold">Want us to fix these for you?</p>
          <p className="text-xs text-muted-foreground">
            BakedBot handles SEO, compliance, campaigns, and customer retention — all in one platform.
          </p>
          <Button asChild className="w-full h-9 mt-1">
            <a href="/get-started">Book a Demo</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
