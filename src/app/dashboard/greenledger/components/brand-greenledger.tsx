'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, TrendingUp, Users, DollarSign, Clock, Pause, Play, Eye, AlertCircle } from 'lucide-react';
import type { GreenLedgerOffer, GreenLedgerAdvance, BrandGreenLedgerSummary } from '@/types/greenledger';
import OfferBuilderSheet from './offer-builder-sheet';
import { publishOfferAction, pauseOfferAction } from '@/server/actions/greenledger';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Props {
  offers: GreenLedgerOffer[];
  advances: GreenLedgerAdvance[];
  summary: BrandGreenLedgerSummary | null;
}

const STATUS_BADGE: Record<GreenLedgerOffer['status'], { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  active: { label: 'Active', className: 'bg-green-500/10 text-green-700 border-green-200' },
  paused: { label: 'Paused', className: 'bg-amber-500/10 text-amber-700 border-amber-200' },
  expired: { label: 'Expired', className: 'bg-red-500/10 text-red-700 border-red-200' },
};

const ADVANCE_STATUS: Record<GreenLedgerAdvance['status'], string> = {
  active: 'Active',
  pending_deposit: 'Awaiting Deposit',
  auto_refund_pending: 'Auto-Refund Pending',
  refund_requested: 'Refund Requested',
  depleted: 'Depleted',
  refunded: 'Refunded',
  expired: 'Expired',
};

export default function BrandGreenLedger({ offers, advances, summary }: Props) {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<GreenLedgerOffer | null>(null);
  const router = useRouter();

  const handlePublish = async (offerId: string) => {
    const result = await publishOfferAction(offerId);
    if (result.success) {
      toast.success('Offer published to marketplace');
      router.refresh();
    } else {
      toast.error(result.error ?? 'Failed to publish');
    }
  };

  const handlePause = async (offerId: string) => {
    const result = await pauseOfferAction(offerId);
    if (result.success) {
      toast.success('Offer paused');
      router.refresh();
    } else {
      toast.error(result.error ?? 'Failed to pause');
    }
  };

  const activeOffers = offers.filter((o) => o.status === 'active');
  const hasOffers = offers.length > 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GreenLedger Advance</h1>
          <p className="text-muted-foreground mt-1">
            Offer early-pay discounts. Get USDC upfront instead of net-30.
          </p>
        </div>
        <Button onClick={() => { setEditingOffer(null); setBuilderOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Offer
        </Button>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                Committed Capital
              </div>
              <p className="text-2xl font-bold">${summary.totalCommittedUsd.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">USDC in escrow</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Users className="h-3.5 w-3.5" />
                Active Partners
              </div>
              <p className="text-2xl font-bold">{summary.activeAdvancesCount}</p>
              <p className="text-xs text-muted-foreground">dispensaries enrolled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Paid Out (Month)
              </div>
              <p className="text-2xl font-bold">${summary.paidOutThisMonthUsd.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">USDC settled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Clock className="h-3.5 w-3.5" />
                Cash Flow Impact
              </div>
              <p className="text-2xl font-bold">+{summary.cashFlowImprovementDays}d</p>
              <p className="text-xs text-muted-foreground">faster than net-30</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {!hasOffers && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No offers yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Create your first GreenLedger offer. Dispensaries pre-fund USDC in exchange for
              a discount — you get paid upfront instead of net-30.
            </p>
            <Button onClick={() => setBuilderOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Offer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Offers + Activity tabs */}
      {hasOffers && (
        <Tabs defaultValue="offers">
          <TabsList>
            <TabsTrigger value="offers">
              Offers
              {activeOffers.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 text-xs">
                  {activeOffers.length} active
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="partners">
              Partners
              {advances.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 text-xs">
                  {advances.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="offers" className="mt-4 space-y-3">
            {offers.map((offer) => {
              const status = STATUS_BADGE[offer.status];
              const bestTier = offer.tiers.reduce((a, b) =>
                a.discountBps > b.discountBps ? a : b,
              );
              return (
                <Card key={offer.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge className={status.className}>{status.label}</Badge>
                          {offer.tiers.map((t) => (
                            <Badge key={t.id} variant="outline" className="font-mono">
                              ${t.minDepositUsd.toLocaleString()} → {(t.discountBps / 100).toFixed(0)}% off
                              {t.durationDays ? ` · ${t.durationDays}d` : ' · ∞'}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{offer.description}</p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>${offer.currentCommitmentsUsd.toFixed(0)} committed</span>
                          {offer.eligibility !== 'all' && (
                            <span className="capitalize">{offer.eligibility.replace('_', ' ')}</span>
                          )}
                          {offer.maxCommitmentsUsd && (
                            <span>cap: ${offer.maxCommitmentsUsd.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {offer.status === 'draft' && (
                          <Button size="sm" onClick={() => handlePublish(offer.id)}>
                            <Play className="h-3.5 w-3.5 mr-1.5" />
                            Publish
                          </Button>
                        )}
                        {offer.status === 'active' && (
                          <Button size="sm" variant="outline" onClick={() => handlePause(offer.id)}>
                            <Pause className="h-3.5 w-3.5 mr-1.5" />
                            Pause
                          </Button>
                        )}
                        {offer.status === 'paused' && (
                          <Button size="sm" variant="outline" onClick={() => handlePublish(offer.id)}>
                            <Play className="h-3.5 w-3.5 mr-1.5" />
                            Resume
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditingOffer(offer); setBuilderOpen(true); }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="partners" className="mt-4 space-y-3">
            {advances.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-center py-12 text-center">
                  <div>
                    <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      No dispensaries have funded an advance yet.
                      <br />
                      Publish your offer to the marketplace to attract partners.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {advances.map((adv) => (
              <Card key={adv.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={adv.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {ADVANCE_STATUS[adv.status]}
                        </Badge>
                        <span className="text-sm font-medium">
                          {(adv.discountBps / 100).toFixed(0)}% discount
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {adv.dispensaryOrgId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${adv.remainingBalanceUsd.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">remaining in escrow</p>
                    </div>
                  </div>
                  {adv.status === 'auto_refund_pending' && adv.autoRefundAt && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                      <AlertCircle className="h-3 w-3" />
                      Auto-refunds on{' '}
                      {(adv.autoRefundAt as unknown as { toDate(): Date }).toDate().toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      <OfferBuilderSheet
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        existingOffer={editingOffer}
        onSaved={() => {
          setBuilderOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
