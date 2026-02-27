'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import { createOfferAction, updateOfferAction, publishOfferAction } from '@/server/actions/greenledger';
import { toast } from 'sonner';
import type { GreenLedgerOffer, OfferTier, CreateOfferInput } from '@/types/greenledger';

interface TierDraft {
  minDepositUsd: number;
  discountPct: number; // display as pct, convert to BPS on save
  durationDays?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingOffer?: GreenLedgerOffer | null;
  onSaved: () => void;
}

export default function OfferBuilderSheet({ open, onOpenChange, existingOffer, onSaved }: Props) {
  const [description, setDescription] = useState(existingOffer?.description ?? '');
  const [eligibility, setEligibility] = useState<CreateOfferInput['eligibility']>(
    existingOffer?.eligibility ?? 'all',
  );
  const [maxCap, setMaxCap] = useState(
    existingOffer?.maxCommitmentsUsd?.toString() ?? '',
  );
  const [tiers, setTiers] = useState<TierDraft[]>(
    existingOffer?.tiers.map((t) => ({
      minDepositUsd: t.minDepositUsd,
      discountPct: t.discountBps / 100,
      durationDays: t.durationDays,
    })) ?? [{ minDepositUsd: 500, discountPct: 7 }],
  );
  const [saving, setSaving] = useState(false);
  const [publishAfterSave, setPublishAfterSave] = useState(false);

  const addTier = () => {
    if (tiers.length >= 3) return;
    const lastTier = tiers[tiers.length - 1];
    setTiers([
      ...tiers,
      { minDepositUsd: (lastTier?.minDepositUsd ?? 500) * 2, discountPct: (lastTier?.discountPct ?? 7) + 3 },
    ]);
  };

  const removeTier = (i: number) => setTiers(tiers.filter((_, idx) => idx !== i));

  const updateTier = (i: number, field: keyof TierDraft, value: number | undefined) => {
    setTiers(tiers.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)));
  };

  const handleSave = async (shouldPublish: boolean) => {
    if (!description.trim()) return toast.error('Please add a description');
    if (tiers.length === 0) return toast.error('Add at least one tier');

    setSaving(true);
    setPublishAfterSave(shouldPublish);

    try {
      const input: CreateOfferInput = {
        description: description.trim(),
        tiers: tiers.map((t) => ({
          minDepositUsd: t.minDepositUsd,
          discountBps: Math.round(t.discountPct * 100),
          durationDays: t.durationDays,
        })),
        eligibility,
        maxCommitmentsUsd: maxCap ? Number(maxCap) : undefined,
      };

      let offerId = existingOffer?.id;

      if (existingOffer) {
        const res = await updateOfferAction(existingOffer.id, input);
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await createOfferAction(input);
        if (!res.success || !res.data) throw new Error(res.error);
        offerId = res.data.id;
      }

      if (shouldPublish && offerId) {
        const pubRes = await publishOfferAction(offerId);
        if (!pubRes.success) throw new Error(pubRes.error);
        toast.success('Offer published to marketplace');
      } else {
        toast.success(existingOffer ? 'Offer updated' : 'Offer saved as draft');
      }

      onSaved();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  };

  // Live preview: best tier discount
  const bestTier = tiers.reduce((a, b) => (a.discountPct > b.discountPct ? a : b), tiers[0]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{existingOffer ? 'Edit Offer' : 'Create GreenLedger Offer'}</SheetTitle>
          <SheetDescription>
            Dispensaries will see this in the marketplace and can pre-fund to activate the discount.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Description */}
          <div className="space-y-2">
            <Label>Marketplace description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Your products, better margins. Pre-fund and save on every order."
              rows={2}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground">{description.length}/160 characters</p>
          </div>

          {/* Eligibility */}
          <div className="space-y-2">
            <Label>Who can see this offer?</Label>
            <RadioGroup
              value={eligibility}
              onValueChange={(v) => setEligibility(v as CreateOfferInput['eligibility'])}
              className="space-y-2"
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="all" id="elig-all" className="mt-0.5" />
                <div>
                  <Label htmlFor="elig-all" className="font-normal cursor-pointer">
                    All dispensaries
                  </Label>
                  <p className="text-xs text-muted-foreground">Appears in discovery section for new partners too</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="partners_only" id="elig-partners" className="mt-0.5" />
                <div>
                  <Label htmlFor="elig-partners" className="font-normal cursor-pointer">
                    Partners only
                  </Label>
                  <p className="text-xs text-muted-foreground">Only dispensaries already carrying your products</p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Tiers */}
          <div className="space-y-3">
            <Label>Offer tiers (1–3)</Label>
            {tiers.map((tier, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tier {i + 1}</span>
                  {tiers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTier(i)}
                      className="h-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Min deposit ($)</Label>
                    <Input
                      type="number"
                      value={tier.minDepositUsd}
                      onChange={(e) => updateTier(i, 'minDepositUsd', Number(e.target.value))}
                      min={50}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Discount (%)</Label>
                    <Input
                      type="number"
                      value={tier.discountPct}
                      onChange={(e) => updateTier(i, 'discountPct', Number(e.target.value))}
                      min={1}
                      max={25}
                      step={0.5}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Days valid</Label>
                    <Input
                      type="number"
                      value={tier.durationDays ?? ''}
                      onChange={(e) =>
                        updateTier(i, 'durationDays', e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="∞"
                      min={1}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            ))}
            {tiers.length < 3 && (
              <Button variant="outline" size="sm" onClick={addTier} className="w-full">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add tier
              </Button>
            )}
          </div>

          {/* Optional cap */}
          <div className="space-y-2">
            <Label>Total commitment cap <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                value={maxCap}
                onChange={(e) => setMaxCap(e.target.value)}
                placeholder="No cap"
                className="pl-7"
                type="number"
                min={100}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Stop accepting new partners once this amount is committed
            </p>
          </div>

          {/* Preview */}
          {bestTier && (
            <div className="border rounded-lg p-3 bg-primary/5 border-primary/20">
              <p className="text-xs font-medium text-muted-foreground mb-2">Marketplace preview</p>
              <p className="text-sm font-medium">
                ${bestTier.minDepositUsd.toLocaleString()} deposit →{' '}
                <span className="text-primary font-bold">{bestTier.discountPct}% off</span>
                {bestTier.durationDays ? ` for ${bestTier.durationDays} days` : ' indefinitely'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving && !publishAfterSave ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              className="flex-1"
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              {saving && publishAfterSave ? 'Publishing...' : 'Publish Offer'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
