'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  DollarSign,
  TrendingUp,
  Search,
  Star,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type {
  MarketplaceOffer,
  AdvanceWithBrand,
  DispensaryGreenLedgerSummary,
} from '@/types/greenledger';
import FundAdvanceFlow from './fund-advance-flow';

interface Props {
  marketplace: MarketplaceOffer[];
  myAdvances: AdvanceWithBrand[];
  summary: DispensaryGreenLedgerSummary | null;
}

const ADVANCE_STATUS_CONFIG: Record<
  AdvanceWithBrand['status'],
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  active: { label: 'Active', icon: CheckCircle2, className: 'text-green-600' },
  pending_deposit: { label: 'Awaiting Deposit', icon: Clock, className: 'text-amber-600' },
  auto_refund_pending: { label: 'Auto-Refund Pending', icon: AlertCircle, className: 'text-orange-600' },
  refund_requested: { label: 'Refund Requested', icon: Clock, className: 'text-muted-foreground' },
  depleted: { label: 'Depleted', icon: AlertCircle, className: 'text-muted-foreground' },
  refunded: { label: 'Refunded', icon: CheckCircle2, className: 'text-muted-foreground' },
  expired: { label: 'Expired', icon: AlertCircle, className: 'text-muted-foreground' },
};

export default function DispensaryGreenLedger({ marketplace, myAdvances, summary }: Props) {
  const [search, setSearch] = useState('');
  const [fundingOffer, setFundingOffer] = useState<MarketplaceOffer | null>(null);

  const partnerOffers = marketplace.filter((o) => o.isExistingPartner);
  const discoveryOffers = marketplace.filter((o) => !o.isExistingPartner);

  const filtered = (offers: MarketplaceOffer[]) =>
    offers.filter(
      (o) =>
        !search ||
        o.brandName.toLowerCase().includes(search.toLowerCase()) ||
        o.description.toLowerCase().includes(search.toLowerCase()),
    );

  const activeAdvances = myAdvances.filter((a) => a.status === 'active');
  const pendingAdvances = myAdvances.filter((a) => a.status === 'pending_deposit');
  const alertAdvances = myAdvances.filter((a) =>
    ['auto_refund_pending', 'refund_requested'].includes(a.status),
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">GreenLedger Advance</h1>
        <p className="text-muted-foreground mt-1">
          Pre-fund brands you carry and save on every order — automatically.
        </p>
      </div>

      {/* Summary stats */}
      {summary && summary.activeAdvancesCount > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground mb-1">Committed</div>
              <p className="text-2xl font-bold">${summary.totalCommittedUsd.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">USDC in escrow</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground mb-1">Active Advances</div>
              <p className="text-2xl font-bold">{summary.activeAdvancesCount}</p>
              <p className="text-xs text-muted-foreground">brand partners</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground mb-1">Saved (Month)</div>
              <p className="text-2xl font-bold text-green-600">
                ${summary.savedThisMonthUsd.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">discount applied</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground mb-1">Avg Discount</div>
              <p className="text-2xl font-bold">{summary.avgDiscountPct.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">across all advances</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts for pending / refund situations */}
      {alertAdvances.length > 0 && (
        <div className="space-y-2">
          {alertAdvances.map((adv) => (
            <div
              key={adv.id}
              className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm"
            >
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="text-amber-800">
                {adv.status === 'auto_refund_pending'
                  ? `Your ${adv.brandName} advance will auto-refund — you removed them from your brand list.`
                  : `${adv.brandName} refund is being processed.`}
              </span>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="marketplace">
        <TabsList>
          <TabsTrigger value="marketplace">
            Marketplace
            {marketplace.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 text-xs">
                {marketplace.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-advances">
            My Advances
            {activeAdvances.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 text-xs">
                {activeAdvances.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="mt-4 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brands..."
              className="pl-9"
            />
          </div>

          {/* Partners first */}
          {filtered(partnerOffers).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Star className="h-3.5 w-3.5" />
                Brands You Carry
              </div>
              {filtered(partnerOffers).map((offer) => (
                <OfferCard key={offer.id} offer={offer} onFund={() => setFundingOffer(offer)} />
              ))}
            </div>
          )}

          {/* Discovery */}
          {filtered(discoveryOffers).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                Discover New Brands
              </div>
              {filtered(discoveryOffers).map((offer) => (
                <OfferCard key={offer.id} offer={offer} onFund={() => setFundingOffer(offer)} />
              ))}
            </div>
          )}

          {marketplace.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center py-12 text-center">
                <div>
                  <DollarSign className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No brand offers available yet.
                    <br />
                    Brands on the platform will post offers here when they&apos;re ready.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My Advances Tab */}
        <TabsContent value="my-advances" className="mt-4 space-y-3">
          {myAdvances.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center py-12 text-center">
                <div>
                  <DollarSign className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No active advances.
                    <br />
                    Browse the marketplace and fund an offer to start saving.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            myAdvances.map((adv) => <AdvanceCard key={adv.id} advance={adv} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Fund flow */}
      {fundingOffer && (
        <FundAdvanceFlow
          offer={fundingOffer}
          open={!!fundingOffer}
          onOpenChange={(open) => { if (!open) setFundingOffer(null); }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function OfferCard({ offer, onFund }: { offer: MarketplaceOffer; onFund: () => void }) {
  const isAlreadyEnrolled = offer.existingAdvance?.status === 'active';
  const isPending = offer.existingAdvance?.status === 'pending_deposit';

  return (
    <Card className={offer.isExistingPartner ? 'border-primary/20' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          {offer.brandLogoUrl ? (
            <img
              src={offer.brandLogoUrl}
              alt={offer.brandName}
              className="h-10 w-10 rounded object-contain bg-muted shrink-0"
            />
          ) : (
            <div
              className="h-10 w-10 rounded shrink-0 flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: offer.brandPrimaryColor ?? '#4ade80' }}
            >
              {offer.brandName[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold">{offer.brandName}</span>
              {offer.isExistingPartner && (
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  Carrying
                </Badge>
              )}
              {isAlreadyEnrolled && (
                <Badge className="text-xs bg-green-500/10 text-green-700 border-green-200">
                  Enrolled
                </Badge>
              )}
              {isPending && (
                <Badge variant="secondary" className="text-xs">
                  Awaiting deposit
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{offer.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {offer.tiers.map((t) => (
                <Badge key={t.id} variant="outline" className="font-mono text-xs">
                  ${t.minDepositUsd.toLocaleString()} → {(t.discountBps / 100).toFixed(0)}% off
                  {t.durationDays ? ` · ${t.durationDays}d` : ''}
                </Badge>
              ))}
            </div>
          </div>
          <div className="shrink-0">
            {isAlreadyEnrolled ? (
              <Button size="sm" variant="outline" disabled>
                Active
              </Button>
            ) : isPending ? (
              <Button size="sm" variant="outline" onClick={onFund}>
                Resume
              </Button>
            ) : (
              <Button size="sm" onClick={onFund}>
                Fund
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdvanceCard({ advance }: { advance: AdvanceWithBrand }) {
  const config = ADVANCE_STATUS_CONFIG[advance.status];
  const StatusIcon = config.icon;
  const pctRemaining =
    advance.totalDepositedUsd > 0
      ? (advance.remainingBalanceUsd / advance.totalDepositedUsd) * 100
      : 0;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          {advance.brandLogoUrl ? (
            <img
              src={advance.brandLogoUrl}
              alt={advance.brandName}
              className="h-10 w-10 rounded object-contain bg-muted shrink-0"
            />
          ) : (
            <div
              className="h-10 w-10 rounded shrink-0 flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: advance.brandPrimaryColor ?? '#4ade80' }}
            >
              {advance.brandName[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">{advance.brandName}</span>
              <Badge variant="outline" className="text-xs font-mono">
                {(advance.discountBps / 100).toFixed(0)}% off
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs mb-2">
              <StatusIcon className={`h-3.5 w-3.5 ${config.className}`} />
              <span className={config.className}>{config.label}</span>
            </div>
            {advance.status === 'active' && advance.totalDepositedUsd > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>${advance.remainingBalanceUsd.toFixed(2)} remaining</span>
                  <span>${advance.totalDepositedUsd.toFixed(2)} deposited</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.max(pctRemaining, 2)}%` }}
                  />
                </div>
                {advance.totalSavedUsd > 0 && (
                  <p className="text-xs text-green-600">
                    Saved ${advance.totalSavedUsd.toFixed(2)} total
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold">${advance.remainingBalanceUsd.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">in escrow</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
