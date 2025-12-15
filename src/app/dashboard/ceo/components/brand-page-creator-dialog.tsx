'use client';

/**
 * Brand Page Creator Dialog
 * Dialog component for creating/editing brand SEO pages
 */

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BrandSearchInput } from './brand-search-input';
import { createBrandPageAction } from '../actions';
import type { BrandCTAType, CreateBrandPageInput } from '@/types/foot-traffic';

interface BrandPageCreatorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const STATES = [
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'IL', label: 'Illinois' },
    { value: 'MI', label: 'Michigan' },
    { value: 'NY', label: 'New York' },
    { value: 'OH', label: 'Ohio' },
    { value: 'NV', label: 'Nevada' },
    { value: 'OR', label: 'Oregon' },
    { value: 'WA', label: 'Washington' },
];

const CTA_TYPES: { value: BrandCTAType; label: string }[] = [
    { value: 'order_online', label: 'Order Online' },
    { value: 'in_store_pickup', label: 'In-Store Pickup' },
    { value: 'view_products', label: 'View Products' },
    { value: 'learn_more', label: 'Learn More' },
];

export function BrandPageCreatorDialog({
    open,
    onOpenChange,
    onSuccess
}: BrandPageCreatorDialogProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [selectedBrand, setSelectedBrand] = useState<{ id: string; name: string; } | null>(null);
    const [formData, setFormData] = useState({
        zoneName: '',
        state: '',
        city: '',
        zipCodes: '',
        radiusMiles: 15,
        priority: 5,
        ctaType: 'order_online' as BrandCTAType,
        ctaUrl: '',
        published: false,
    });

    const resetForm = () => {
        setSelectedBrand(null);
        setFormData({
            zoneName: '',
            state: '',
            city: '',
            zipCodes: '',
            radiusMiles: 15,
            priority: 5,
            ctaType: 'order_online',
            ctaUrl: '',
            published: false,
        });
    };

    const handleSubmit = async () => {
        // Validation
        if (!selectedBrand) {
            toast({ title: 'Missing Brand', description: 'Please select a brand.', variant: 'destructive' });
            return;
        }
        if (!formData.state) {
            toast({ title: 'Missing State', description: 'Please select a state.', variant: 'destructive' });
            return;
        }
        if (!formData.city) {
            toast({ title: 'Missing City', description: 'Please enter a city.', variant: 'destructive' });
            return;
        }
        if (!formData.zipCodes.trim()) {
            toast({ title: 'Missing ZIP Codes', description: 'Please enter at least one ZIP code.', variant: 'destructive' });
            return;
        }
        if (!formData.ctaUrl.trim()) {
            toast({ title: 'Missing CTA URL', description: 'Please enter a CTA link.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);

        try {
            // Parse ZIP codes (comma-separated, support ranges like 90001-90010)
            const zipCodes = parseZipCodes(formData.zipCodes);

            if (zipCodes.length === 0) {
                toast({ title: 'Invalid ZIP Codes', description: 'Please enter valid ZIP codes.', variant: 'destructive' });
                setIsSubmitting(false);
                return;
            }

            const input: CreateBrandPageInput = {
                brandId: selectedBrand.id,
                brandName: selectedBrand.name,
                brandSlug: selectedBrand.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                zipCodes,
                city: formData.city,
                state: formData.state,
                zoneName: formData.zoneName || undefined,
                radiusMiles: formData.radiusMiles,
                priority: formData.priority,
                ctaType: formData.ctaType,
                ctaUrl: formData.ctaUrl,
                published: formData.published,
            };

            const result = await createBrandPageAction(input);

            if (result.error) {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            } else {
                toast({ title: 'Success!', description: result.message });
                resetForm();
                onOpenChange(false);
                onSuccess?.();
            }
        } catch (error: any) {
            console.error('Form submission error:', error);
            toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Generate Brand Page
                    </DialogTitle>
                    <DialogDescription>
                        Create a branded SEO page for a specific brand and ZIP code(s).
                        This page will help drive local foot traffic and improve search rankings.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Brand Search */}
                    <BrandSearchInput
                        value={selectedBrand}
                        onChange={setSelectedBrand}
                        required
                    />

                    {/* Zone Name (Optional) */}
                    <div className="space-y-2">
                        <Label htmlFor="zoneName">Zone Name (Optional)</Label>
                        <Input
                            id="zoneName"
                            placeholder="e.g., LA Metro, NorCal Premium"
                            value={formData.zoneName}
                            onChange={(e) => setFormData({ ...formData, zoneName: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                            Marketing-friendly name to group campaigns.
                        </p>
                    </div>

                    {/* State & City */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="state">State <span className="text-destructive">*</span></Label>
                            <Select
                                value={formData.state}
                                onValueChange={(value) => setFormData({ ...formData, state: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                            <Input
                                id="city"
                                placeholder="e.g., Los Angeles"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* ZIP Codes */}
                    <div className="space-y-2">
                        <Label htmlFor="zipCodes">ZIP Codes <span className="text-destructive">*</span></Label>
                        <Textarea
                            id="zipCodes"
                            placeholder="90001, 90002, 90003, ... or 90001-90010"
                            value={formData.zipCodes}
                            onChange={(e) => setFormData({ ...formData, zipCodes: e.target.value })}
                            rows={2}
                        />
                        <p className="text-xs text-muted-foreground">
                            Enter ZIP codes separated by commas. You can also enter ranges like 90001-90010.
                        </p>
                    </div>

                    {/* Radius & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="radius">Radius (miles)</Label>
                            <Input
                                id="radius"
                                type="number"
                                min={1}
                                max={100}
                                value={formData.radiusMiles}
                                onChange={(e) => setFormData({ ...formData, radiusMiles: parseInt(e.target.value) || 15 })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority (1-10)</Label>
                            <Input
                                id="priority"
                                type="number"
                                min={1}
                                max={10}
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 5 })}
                            />
                        </div>
                    </div>

                    {/* CTA Configuration */}
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                        <h4 className="font-medium text-sm">Call-to-Action</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ctaType">CTA Type <span className="text-destructive">*</span></Label>
                                <Select
                                    value={formData.ctaType}
                                    onValueChange={(value) => setFormData({ ...formData, ctaType: value as BrandCTAType })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select CTA type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CTA_TYPES.map((cta) => (
                                            <SelectItem key={cta.value} value={cta.value}>{cta.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ctaUrl">CTA URL <span className="text-destructive">*</span></Label>
                                <Input
                                    id="ctaUrl"
                                    type="url"
                                    placeholder="https://..."
                                    value={formData.ctaUrl}
                                    onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Publish Toggle */}
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                        <div>
                            <Label htmlFor="published" className="text-sm font-medium">Publish Immediately</Label>
                            <p className="text-xs text-muted-foreground">
                                If off, the page will be saved as a draft.
                            </p>
                        </div>
                        <Switch
                            id="published"
                            checked={formData.published}
                            onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {formData.published ? 'Create & Publish' : 'Save as Draft'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Parse ZIP codes from user input
 * Supports comma-separated and ranges (e.g., 90001-90010)
 */
function parseZipCodes(input: string): string[] {
    const result: string[] = [];
    const parts = input.split(',').map(s => s.trim()).filter(Boolean);

    for (const part of parts) {
        if (part.includes('-')) {
            // Range like 90001-90010
            const [start, end] = part.split('-').map(s => parseInt(s.trim()));
            if (!isNaN(start) && !isNaN(end) && start <= end && end - start <= 100) {
                for (let i = start; i <= end; i++) {
                    result.push(String(i).padStart(5, '0'));
                }
            }
        } else if (/^\d{5}$/.test(part)) {
            // Single 5-digit ZIP
            result.push(part);
        }
    }

    return Array.from(new Set(result)); // Remove duplicates
}
