'use client';

/**
 * USDC Payments Settings Tab
 *
 * Displays:
 * - USDC balance card + refresh button
 * - Funding QR code + copyable wallet address
 * - Per-route pricing guide
 * - Usage history table
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Wallet, RefreshCw, Copy, Check, ExternalLink, Zap } from 'lucide-react';
import {
  getX402WalletAction,
  fundX402WalletAction,
  getX402UsageAction,
  refreshX402BalanceAction,
} from '@/server/actions/x402';
import { X402_ROUTE_PRICING } from '@/types/x402';
import type { X402Wallet, X402Usage } from '@/types/x402';

const ROUTE_LABELS: Record<string, string> = {
  '/api/agent/chat': 'Agent Chat',
  '/api/jobs/research': 'Big Worm Research',
  '/api/cron/morning-briefing': 'Morning Briefing',
  '/api/agent/invoke': 'Agent Invoke',
};

export function PaymentsTab() {
  const [wallet, setWallet] = useState<X402Wallet | null>(null);
  const [funding, setFunding] = useState<{
    walletAddress: string;
    qrCodeDataUrl: string;
    usdcBalanceUsd: number;
  } | null>(null);
  const [usage, setUsage] = useState<X402Usage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [walletRes, fundingRes, usageRes] = await Promise.all([
        getX402WalletAction(),
        fundX402WalletAction(),
        getX402UsageAction(25),
      ]);

      if (walletRes.success && walletRes.data) setWallet(walletRes.data);
      if (fundingRes.success && fundingRes.data) setFunding(fundingRes.data);
      if (usageRes.success && usageRes.data) setUsage(usageRes.data);
    } catch (err) {
      setError('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefreshBalance = async () => {
    try {
      setRefreshing(true);
      const result = await refreshX402BalanceAction();
      if (result.success && result.balance !== undefined) {
        setWallet((prev) => prev ? { ...prev, usdcBalanceUsd: result.balance! } : prev);
        setFunding((prev) => prev ? { ...prev, usdcBalanceUsd: result.balance! } : prev);
      }
    } catch {
      // non-fatal
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopyAddress = async () => {
    if (!funding?.walletAddress) return;
    await navigator.clipboard.writeText(funding.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32 bg-muted/20" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p>{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadData}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalSpent = wallet?.totalSpentUsd ?? 0;
  const balance = wallet?.usdcBalanceUsd ?? 0;

  return (
    <div className="space-y-6">

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>USDC Balance</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshBalance}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          <CardDescription>
            USDC on Base (eip155:8453) — 1 USDC = $1.00 USD
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className={`text-3xl font-bold ${balance < 0.01 ? 'text-destructive' : 'text-primary'}`}>
                ${balance.toFixed(4)}
              </p>
              {balance < 0.10 && (
                <Badge variant="destructive" className="mt-1 text-xs">
                  Low balance — top up to continue
                </Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent (All Time)</p>
              <p className="text-3xl font-bold text-foreground">
                ${totalSpent.toFixed(4)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funding Instructions */}
      {funding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deposit USDC</CardTitle>
            <CardDescription>
              Send USDC on Base to this address from any wallet (Coinbase, MetaMask, Rainbow, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* QR Code */}
              <div className="shrink-0">
                <img
                  src={funding.qrCodeDataUrl}
                  alt="USDC deposit QR code"
                  className="w-40 h-40 rounded-lg border"
                />
                <p className="text-xs text-center text-muted-foreground mt-1">Base Network</p>
              </div>

              {/* Address */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Wallet Address</p>
                  <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
                    <code className="text-xs flex-1 break-all font-mono">
                      {funding.walletAddress}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyAddress}
                      className="shrink-0 h-7 w-7 p-0"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>⚠️ Only send <strong>USDC on Base</strong> (chain ID 8453) to this address.</p>
                  <p>Sending other tokens or using a different network may result in permanent loss.</p>
                  <p>Deposits are credited automatically once confirmed on-chain (typically &lt;30 seconds).</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  asChild
                >
                  <a
                    href={`https://basescan.org/address/${funding.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on Basescan
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Guide */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Per-Call Pricing</CardTitle>
          </div>
          <CardDescription>
            Orgs with active subscriptions bypass USDC billing automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>API Route</TableHead>
                <TableHead className="text-right">Cost per Call</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(X402_ROUTE_PRICING).map(([route, price]) => (
                <TableRow key={route}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">
                        {ROUTE_LABELS[route] ?? route}
                      </p>
                      <code className="text-xs text-muted-foreground">{route}</code>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    ${price.toFixed(4)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Usage History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Usage</CardTitle>
          <CardDescription>Last 25 API calls billed to your USDC balance</CardDescription>
        </CardHeader>
        <CardContent>
          {usage.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No usage yet. Calls to agent APIs will appear here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <code className="text-xs">{item.route}</code>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      ${item.amountUsd.toFixed(4)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.status === 'confirmed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.createdAt
                        ? new Date((item.createdAt as any).seconds * 1000).toLocaleString()
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
