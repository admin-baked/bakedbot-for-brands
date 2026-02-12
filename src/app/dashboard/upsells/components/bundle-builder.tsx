'use client';

/**
 * Bundle Builder Component
 *
 * Visual bundle creation with upsell preview, showing how bundles
 * will appear as upsell suggestions in different placements.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Eye, Save, PackagePlus } from 'lucide-react';
import Link from 'next/link';

interface BundleBuilderProps {
    orgId: string;
}

export function BundleBuilder({ orgId }: BundleBuilderProps) {
    const [bundleName, setBundleName] = useState('');
    const [discount, setDiscount] = useState('15');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Quick Bundle Builder</CardTitle>
                    <CardDescription>
                        Create product bundles that automatically appear as upsell suggestions
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Bundle Info */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="bundleName">Bundle Name</Label>
                            <Input
                                id="bundleName"
                                placeholder="e.g., Sleep Starter Pack"
                                value={bundleName}
                                onChange={(e) => setBundleName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="discount">Discount (%)</Label>
                            <Input
                                id="discount"
                                type="number"
                                placeholder="15"
                                value={discount}
                                onChange={(e) => setDiscount(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Product Selection */}
                    <div className="space-y-3">
                        <Label>Bundle Products</Label>
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                            <PackagePlus className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground mb-3">
                                Add products to this bundle
                            </p>
                            <Button variant="outline" size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Select Products
                            </Button>
                        </div>
                    </div>

                    {/* Upsell Strategy */}
                    <div className="space-y-3">
                        <Label>Upsell Targeting</Label>
                        <div className="grid gap-3">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <p className="font-medium text-sm">Show as upsell when any bundle product is viewed</p>
                                    <p className="text-xs text-muted-foreground">
                                        Suggest complete bundle at product detail page
                                    </p>
                                </div>
                                <input type="checkbox" defaultChecked className="h-4 w-4" />
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <p className="font-medium text-sm">Show in cart when 1+ bundle items added</p>
                                    <p className="text-xs text-muted-foreground">
                                        "Complete your {bundleName || 'bundle'} - save {discount}%"
                                    </p>
                                </div>
                                <input type="checkbox" defaultChecked className="h-4 w-4" />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button className="flex-1">
                            <Save className="h-4 w-4 mr-2" />
                            Save Bundle
                        </Button>
                        <Button variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <PackagePlus className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-2">
                            <p className="font-medium text-sm">
                                For advanced bundle management, use the full Bundles page
                            </p>
                            <p className="text-xs text-muted-foreground">
                                The Bundles page offers advanced features like inventory sync,
                                multi-tier discounts, and A/B testing.
                            </p>
                            <Button variant="link" className="h-auto p-0 text-sm" asChild>
                                <Link href="/dashboard/bundles">
                                    Go to Bundles →
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
