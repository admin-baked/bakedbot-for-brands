'use client';

/**
 * Loyalty Program Settings
 *
 * Configurable thresholds for:
 * - Points earning rate
 * - Loyalty tiers (spend thresholds + benefits)
 * - Segment behavior thresholds (loyal, VIP, at-risk cutoffs)
 * - Redemption tiers (points → dollar value)
 *
 * Access: /dashboard/settings/loyalty (dispensary role)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { getLoyaltySettings, updateLoyaltySettings, updateSegmentThresholds } from '@/server/actions/loyalty-settings';
import { DEFAULT_LOYALTY_SETTINGS } from '@/types/customers';
import type { LoyaltySettings, LoyaltyTier, RedemptionTier, SegmentThresholds, DiscountProgram, DiscountProgramIcon, LoyaltyMenuDisplay } from '@/types/customers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Crown, Star, Settings2, Gift, Plus, Trash2, Save, RotateCcw, Loader2, Info, Eye, Shield, GraduationCap, Tag, Heart, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// --------------------------------------------------------------------------
// Points Tab
// --------------------------------------------------------------------------

function PointsTab({ settings, orgId, onSaved }: {
    settings: LoyaltySettings;
    orgId: string;
    onSaved: () => void;
}) {
    const { toast } = useToast();
    const [points, setPoints] = useState(settings.pointsPerDollar);
    const [equity, setEquity] = useState(settings.equityMultiplier);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setPoints(settings.pointsPerDollar);
        setEquity(settings.equityMultiplier);
    }, [settings]);

    const handleSave = async () => {
        setSaving(true);
        const result = await updateLoyaltySettings(orgId, {
            pointsPerDollar: points,
            equityMultiplier: equity,
        });
        setSaving(false);
        if (result.success) {
            toast({ title: 'Points settings saved' });
            onSaved();
        } else {
            toast({ title: 'Error saving', description: result.error, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-6 max-w-md">
            <div className="space-y-2">
                <Label>Points per dollar spent</Label>
                <div className="flex items-center gap-3">
                    <Input
                        type="number"
                        min={0.1}
                        max={10}
                        step={0.5}
                        value={points}
                        onChange={e => setPoints(Number(e.target.value))}
                        className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">pts per $1</span>
                </div>
                <p className="text-xs text-muted-foreground">
                    A customer spending $50 earns {(50 * points).toFixed(0)} points
                </p>
            </div>

            <div className="space-y-2">
                <Label>Equity applicant multiplier</Label>
                <div className="flex items-center gap-3">
                    <Input
                        type="number"
                        min={1}
                        max={5}
                        step={0.1}
                        value={equity}
                        onChange={e => setEquity(Number(e.target.value))}
                        className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">× points</span>
                </div>
                <p className="text-xs text-muted-foreground">
                    Social equity license holders earn {equity}× the standard rate
                </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Points Settings
            </Button>
        </div>
    );
}

// --------------------------------------------------------------------------
// Tiers Tab
// --------------------------------------------------------------------------

const TIER_COLORS = ['#cd7f32', '#c0c0c0', '#ffd700', '#e5e4e2', '#a855f7', '#3b82f6'];

function TiersTab({ settings, orgId, onSaved }: {
    settings: LoyaltySettings;
    orgId: string;
    onSaved: () => void;
}) {
    const { toast } = useToast();
    const [tiers, setTiers] = useState<LoyaltyTier[]>(settings.tiers);
    const [saving, setSaving] = useState(false);

    useEffect(() => { setTiers(settings.tiers); }, [settings.tiers]);

    const updateTier = (id: string, field: keyof LoyaltyTier, value: unknown) => {
        setTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const updateBenefit = (tierId: string, idx: number, value: string) => {
        setTiers(prev => prev.map(t => {
            if (t.id !== tierId) return t;
            const benefits = [...t.benefits];
            benefits[idx] = value;
            return { ...t, benefits };
        }));
    };

    const addBenefit = (tierId: string) => {
        setTiers(prev => prev.map(t =>
            t.id === tierId ? { ...t, benefits: [...t.benefits, ''] } : t
        ));
    };

    const removeBenefit = (tierId: string, idx: number) => {
        setTiers(prev => prev.map(t =>
            t.id === tierId ? { ...t, benefits: t.benefits.filter((_, i) => i !== idx) } : t
        ));
    };

    const addTier = () => {
        const newTier: LoyaltyTier = {
            id: `tier_${Date.now()}`,
            name: 'New Tier',
            threshold: 2000,
            color: TIER_COLORS[tiers.length % TIER_COLORS.length],
            benefits: ['Custom benefit'],
        };
        setTiers(prev => [...prev, newTier]);
    };

    const removeTier = (id: string) => {
        setTiers(prev => prev.filter(t => t.id !== id));
    };

    const handleSave = async () => {
        setSaving(true);
        const result = await updateLoyaltySettings(orgId, { tiers });
        setSaving(false);
        if (result.success) {
            toast({ title: 'Tiers saved' });
            onSaved();
        } else {
            toast({ title: 'Error saving', description: result.error, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4">
            {tiers.map((tier, i) => (
                <Card key={tier.id}>
                    <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded-full border"
                                    style={{ backgroundColor: tier.color }}
                                />
                                <Input
                                    value={tier.name}
                                    onChange={e => updateTier(tier.id, 'name', e.target.value)}
                                    className="h-8 w-36 font-semibold"
                                />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeTier(tier.id)}
                                disabled={tiers.length <= 1}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Spend threshold ($)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={tier.threshold}
                                    onChange={e => updateTier(tier.id, 'threshold', Number(e.target.value))}
                                    className="h-8"
                                    disabled={i === 0}
                                />
                                {i === 0 && <p className="text-xs text-muted-foreground mt-1">Entry tier (always $0)</p>}
                            </div>
                            <div>
                                <Label className="text-xs">Color</Label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={tier.color}
                                        onChange={e => updateTier(tier.id, 'color', e.target.value)}
                                        className="h-8 w-16 rounded border cursor-pointer"
                                    />
                                    <span className="text-xs text-muted-foreground">{tier.color}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs">Benefits</Label>
                            <div className="space-y-1 mt-1">
                                {tier.benefits.map((b, bi) => (
                                    <div key={bi} className="flex gap-2">
                                        <Input
                                            value={b}
                                            onChange={e => updateBenefit(tier.id, bi, e.target.value)}
                                            className="h-7 text-sm"
                                            placeholder="Benefit description"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 shrink-0 text-muted-foreground"
                                            onClick={() => removeBenefit(tier.id, bi)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => addBenefit(tier.id)}
                                >
                                    <Plus className="h-3 w-3" /> Add benefit
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}

            <div className="flex gap-3">
                <Button variant="outline" onClick={addTier} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Tier
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Tiers
                </Button>
            </div>
        </div>
    );
}

// --------------------------------------------------------------------------
// Segments Tab
// --------------------------------------------------------------------------

interface ThresholdField {
    key: keyof SegmentThresholds;
    label: string;
    description: string;
    unit: string;
}

const THRESHOLD_FIELDS: ThresholdField[] = [
    { key: 'loyal_minOrders', label: 'Loyal: min orders', description: 'Minimum order count to be "Loyal"', unit: 'orders' },
    { key: 'vip_minLifetimeValue', label: 'VIP: min lifetime value', description: 'Min total spend to be "VIP"', unit: '$' },
    { key: 'vip_minOrders', label: 'VIP: min orders', description: 'Alternate VIP path: min orders', unit: 'orders' },
    { key: 'vip_minAOV', label: 'VIP: min AOV', description: 'Alternate VIP path: min avg order value', unit: '$' },
    { key: 'highValue_minAOV', label: 'High Value: min AOV', description: 'Min avg order value to be "High Value"', unit: '$' },
    { key: 'highValue_maxOrders', label: 'High Value: max orders', description: 'Max orders (below this = high value)', unit: 'orders' },
    { key: 'frequent_minOrders', label: 'Frequent: min orders', description: 'Min orders to be "Frequent"', unit: 'orders' },
    { key: 'frequent_maxAOV', label: 'Frequent: max AOV', description: 'Max AOV for "Frequent" segment', unit: '$' },
    { key: 'slipping_minDays', label: 'Slipping: inactive days', description: 'Days without order → "Slipping"', unit: 'days' },
    { key: 'atRisk_minDays', label: 'At Risk: inactive days', description: 'Days without order → "At Risk"', unit: 'days' },
    { key: 'churned_minDays', label: 'Churned: inactive days', description: 'Days without order → "Churned"', unit: 'days' },
    { key: 'new_maxDays', label: 'New: max days since first order', description: 'Customer is "New" within this window', unit: 'days' },
];

function SegmentsTab({ settings, orgId, onSaved }: {
    settings: LoyaltySettings;
    orgId: string;
    onSaved: () => void;
}) {
    const { toast } = useToast();
    const defaults = DEFAULT_LOYALTY_SETTINGS.segmentThresholds!;
    const [thresholds, setThresholds] = useState<SegmentThresholds>({
        ...defaults,
        ...(settings.segmentThresholds || {}),
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setThresholds({ ...defaults, ...(settings.segmentThresholds || {}) });
    }, [settings.segmentThresholds]);

    const handleReset = () => setThresholds({ ...defaults });

    const handleSave = async () => {
        setSaving(true);
        const result = await updateSegmentThresholds(orgId, thresholds);
        setSaving(false);
        if (result.success) {
            toast({ title: 'Segment thresholds saved' });
            onSaved();
        } else {
            toast({ title: 'Error saving', description: result.error, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4">
            <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                    <div className="flex gap-2 items-start">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-800">
                            These thresholds determine which segment each customer falls into.
                            Changes take effect on the next sync or customer update.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {THRESHOLD_FIELDS.map(field => {
                    const defaultVal = defaults[field.key];
                    const currentVal = thresholds[field.key];
                    const changed = currentVal !== defaultVal;
                    return (
                        <div key={field.key} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">{field.label}</Label>
                                {changed && (
                                    <Badge variant="secondary" className="text-xs">
                                        Default: {defaultVal}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min={0}
                                    value={currentVal}
                                    onChange={e => setThresholds(prev => ({
                                        ...prev,
                                        [field.key]: Number(e.target.value),
                                    }))}
                                    className={cn('h-8', changed && 'border-blue-400')}
                                />
                                <span className="text-xs text-muted-foreground w-12 shrink-0">{field.unit}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{field.description}</p>
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-3">
                <Button variant="outline" onClick={handleReset} className="gap-2">
                    <RotateCcw className="h-4 w-4" /> Reset to Defaults
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Thresholds
                </Button>
            </div>
        </div>
    );
}

// --------------------------------------------------------------------------
// Redemptions Tab
// --------------------------------------------------------------------------

function RedemptionsTab({ settings, orgId, onSaved }: {
    settings: LoyaltySettings;
    orgId: string;
    onSaved: () => void;
}) {
    const { toast } = useToast();
    const [tiers, setTiers] = useState<RedemptionTier[]>(settings.redemptionTiers ?? []);
    const [saving, setSaving] = useState(false);

    useEffect(() => { setTiers(settings.redemptionTiers ?? []); }, [settings.redemptionTiers]);

    const update = (id: string, field: keyof RedemptionTier, value: unknown) => {
        setTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const add = () => {
        setTiers(prev => [...prev, {
            id: `redemption_${Date.now()}`,
            pointsCost: 500,
            rewardValue: 25,
            description: '$25 off your order',
        }]);
    };

    const remove = (id: string) => setTiers(prev => prev.filter(t => t.id !== id));

    const handleSave = async () => {
        setSaving(true);
        const result = await updateLoyaltySettings(orgId, { redemptionTiers: tiers });
        setSaving(false);
        if (result.success) {
            toast({ title: 'Redemption tiers saved' });
            onSaved();
        } else {
            toast({ title: 'Error saving', description: result.error, variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Define how customers redeem points for discounts. These appear at checkout.
            </p>
            {tiers.map(tier => (
                <Card key={tier.id}>
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-3 gap-3 items-end">
                            <div>
                                <Label className="text-xs">Points cost</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={tier.pointsCost}
                                    onChange={e => update(tier.id, 'pointsCost', Number(e.target.value))}
                                    className="h-8"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Dollar value ($)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={tier.rewardValue}
                                    onChange={e => update(tier.id, 'rewardValue', Number(e.target.value))}
                                    className="h-8"
                                />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => remove(tier.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="mt-2">
                            <Label className="text-xs">Display description</Label>
                            <Input
                                value={tier.description}
                                onChange={e => update(tier.id, 'description', e.target.value)}
                                className="h-8 text-sm"
                                placeholder="e.g. $15 off your order"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Effective rate: {tier.pointsCost > 0 ? ((tier.rewardValue / tier.pointsCost) * 100).toFixed(1) : '0'}¢ per point
                        </p>
                    </CardContent>
                </Card>
            ))}
            <div className="flex gap-3">
                <Button variant="outline" onClick={add} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Redemption Option
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Redemptions
                </Button>
            </div>
        </div>
    );
}

// --------------------------------------------------------------------------
// Menu Display Tab
// --------------------------------------------------------------------------

const ICON_OPTIONS: { value: DiscountProgramIcon; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'shield', label: 'Military', Icon: Shield },
    { value: 'star', label: 'Senior', Icon: Star },
    { value: 'graduation-cap', label: 'Student', Icon: GraduationCap },
    { value: 'heart', label: 'Medical', Icon: Heart },
    { value: 'users', label: 'Group', Icon: Users },
    { value: 'tag', label: 'General', Icon: Tag },
];

function iconForKey(key: DiscountProgramIcon) {
    return ICON_OPTIONS.find(o => o.value === key)?.Icon ?? Tag;
}

function MenuDisplayTab({ settings, orgId, onSaved }: {
    settings: LoyaltySettings;
    orgId: string;
    onSaved: () => void;
}) {
    const { toast } = useToast();
    const defaultDisplay = DEFAULT_LOYALTY_SETTINGS.menuDisplay!;
    const [display, setDisplay] = useState<LoyaltyMenuDisplay>({
        ...defaultDisplay,
        ...(settings.menuDisplay || {}),
    });
    const [programs, setPrograms] = useState<DiscountProgram[]>(
        settings.discountPrograms?.length
            ? settings.discountPrograms
            : (DEFAULT_LOYALTY_SETTINGS.discountPrograms ?? [])
    );
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setDisplay({ ...defaultDisplay, ...(settings.menuDisplay || {}) });
        setPrograms(settings.discountPrograms?.length
            ? settings.discountPrograms
            : (DEFAULT_LOYALTY_SETTINGS.discountPrograms ?? []));
    }, [settings]);

    const updateProgram = (id: string, field: keyof DiscountProgram, value: unknown) => {
        setPrograms(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const addProgram = () => {
        setPrograms(prev => [...prev, {
            id: `program_${Date.now()}`,
            enabled: true,
            name: 'New Discount',
            description: '10% off with valid ID',
            icon: 'tag',
        }]);
    };

    const removeProgram = (id: string) => setPrograms(prev => prev.filter(p => p.id !== id));

    const handleSave = async () => {
        setSaving(true);
        const result = await updateLoyaltySettings(orgId, { menuDisplay: display, discountPrograms: programs });
        setSaving(false);
        if (result.success) {
            toast({ title: 'Menu display settings saved' });
            onSaved();
        } else {
            toast({ title: 'Error saving', description: result.error, variant: 'destructive' });
        }
    };

    // Build loyalty tagline from settings if not set
    const autoTagline = `Earn ${settings.pointsPerDollar} pt${settings.pointsPerDollar !== 1 ? 's' : ''} per $1 spent — redeem for discounts`;

    return (
        <div className="space-y-6">
            {/* Global bar toggle */}
            <Card>
                <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Show loyalty &amp; offers bar</p>
                            <p className="text-sm text-muted-foreground">Displays the loyalty tagline and discount programs at the top of your public menu</p>
                        </div>
                        <Switch
                            checked={display.showBar}
                            onCheckedChange={v => setDisplay(d => ({ ...d, showBar: v }))}
                        />
                    </div>

                    {display.showBar && (
                        <>
                            <div className="space-y-1">
                                <Label>Loyalty tagline</Label>
                                <Input
                                    placeholder={autoTagline}
                                    value={display.loyaltyTagline ?? ''}
                                    onChange={e => setDisplay(d => ({ ...d, loyaltyTagline: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground">Leave blank to use auto-generated: "{autoTagline}"</p>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Show discount programs</p>
                                    <p className="text-xs text-muted-foreground">Military, senior, student etc.</p>
                                </div>
                                <Switch
                                    checked={display.showDiscountPrograms}
                                    onCheckedChange={v => setDisplay(d => ({ ...d, showDiscountPrograms: v }))}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Delivery info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Delivery Info</CardTitle>
                    <CardDescription>Show delivery terms on your public menu page</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Show delivery info bar</p>
                        <Switch
                            checked={display.showDeliveryInfo}
                            onCheckedChange={v => setDisplay(d => ({ ...d, showDeliveryInfo: v }))}
                        />
                    </div>

                    {display.showDeliveryInfo && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs">Order minimum ($)</Label>
                                <Input
                                    type="number" min={0}
                                    value={display.deliveryMinimum ?? 50}
                                    onChange={e => setDisplay(d => ({ ...d, deliveryMinimum: Number(e.target.value) }))}
                                    className="h-8"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Delivery fee ($)</Label>
                                <Input
                                    type="number" min={0}
                                    value={display.deliveryFee ?? 10}
                                    onChange={e => setDisplay(d => ({ ...d, deliveryFee: Number(e.target.value) }))}
                                    className="h-8"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Radius (miles)</Label>
                                <Input
                                    type="number" min={0}
                                    value={display.deliveryRadius ?? 20}
                                    onChange={e => setDisplay(d => ({ ...d, deliveryRadius: Number(e.target.value) }))}
                                    className="h-8"
                                />
                            </div>
                            <div className="col-span-3 flex items-center justify-between">
                                <p className="text-sm font-medium">Show drive-thru messaging</p>
                                <Switch
                                    checked={display.showDriveThru ?? false}
                                    onCheckedChange={v => setDisplay(d => ({ ...d, showDriveThru: v }))}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Discount programs */}
            {display.showBar && display.showDiscountPrograms && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Discount Programs</CardTitle>
                        <CardDescription>Military, senior, student, and other discount programs shown on your menu</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {programs.map(program => {
                            const IconComp = iconForKey(program.icon);
                            return (
                                <div key={program.id} className="flex items-start gap-3 p-3 rounded-lg border">
                                    <Switch
                                        checked={program.enabled}
                                        onCheckedChange={v => updateProgram(program.id, 'enabled', v)}
                                        className="mt-0.5"
                                    />
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-xs">Program name</Label>
                                            <Input
                                                value={program.name}
                                                onChange={e => updateProgram(program.id, 'name', e.target.value)}
                                                className="h-8"
                                                disabled={!program.enabled}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Description (shown on menu)</Label>
                                            <Input
                                                value={program.description}
                                                onChange={e => updateProgram(program.id, 'description', e.target.value)}
                                                className="h-8"
                                                placeholder="e.g. 10% off every visit"
                                                disabled={!program.enabled}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Icon</Label>
                                            <select
                                                value={program.icon}
                                                onChange={e => updateProgram(program.id, 'icon', e.target.value as DiscountProgramIcon)}
                                                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
                                                disabled={!program.enabled}
                                            >
                                                {ICON_OPTIONS.map(o => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-end">
                                            {program.enabled && (
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <IconComp className="h-4 w-4" />
                                                    <span>{program.name}: {program.description}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-8 w-8 text-destructive shrink-0"
                                        onClick={() => removeProgram(program.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                        <Button variant="outline" size="sm" onClick={addProgram} className="gap-2">
                            <Plus className="h-4 w-4" /> Add Program
                        </Button>
                    </CardContent>
                </Card>
            )}

            <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Menu Display
            </Button>
        </div>
    );
}

// --------------------------------------------------------------------------
// Main Page
// --------------------------------------------------------------------------

export default function LoyaltySettingsPage() {
    const { orgId } = useUserRole();
    const [settings, setSettings] = useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS);
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        const result = await getLoyaltySettings(orgId);
        if (result.success && result.data) {
            setSettings(result.data);
        }
        setLoading(false);
    }, [orgId]);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container max-w-3xl py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Crown className="h-8 w-8 text-purple-600" />
                    Loyalty Program Settings
                </h1>
                <p className="text-muted-foreground mt-1">
                    Configure points, tiers, customer segments, and redemption options for your loyalty program.
                </p>
            </div>

            <Tabs defaultValue="points">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="points" className="gap-1">
                        <Star className="h-3.5 w-3.5" /> Points
                    </TabsTrigger>
                    <TabsTrigger value="tiers" className="gap-1">
                        <Crown className="h-3.5 w-3.5" /> Tiers
                    </TabsTrigger>
                    <TabsTrigger value="segments" className="gap-1">
                        <Settings2 className="h-3.5 w-3.5" /> Segments
                    </TabsTrigger>
                    <TabsTrigger value="redemptions" className="gap-1">
                        <Gift className="h-3.5 w-3.5" /> Redemptions
                    </TabsTrigger>
                    <TabsTrigger value="menu-display" className="gap-1">
                        <Eye className="h-3.5 w-3.5" /> Menu
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="points" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Points Earning</CardTitle>
                            <CardDescription>How many points customers earn per dollar spent</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PointsTab settings={settings} orgId={orgId || ''} onSaved={fetchSettings} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tiers" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Loyalty Tiers</CardTitle>
                            <CardDescription>Spend thresholds and benefits for each tier</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TiersTab settings={settings} orgId={orgId || ''} onSaved={fetchSettings} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="segments" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Segment Thresholds</CardTitle>
                            <CardDescription>
                                Customize when customers move between segments like "Loyal", "VIP", and "At Risk"
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SegmentsTab settings={settings} orgId={orgId || ''} onSaved={fetchSettings} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="redemptions" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Redemption Options</CardTitle>
                            <CardDescription>How customers convert points into discounts at checkout</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RedemptionsTab settings={settings} orgId={orgId || ''} onSaved={fetchSettings} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="menu-display" className="mt-6">
                    <MenuDisplayTab settings={settings} orgId={orgId || ''} onSaved={fetchSettings} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
