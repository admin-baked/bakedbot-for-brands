'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateBrandProfile, requestBrandNameChange } from '@/server/actions/brand-profile';
import { useUser } from '@/firebase/auth/use-user';
import { Loader2, ExternalLink, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { SyncedProductsGrid } from './components/synced-products-grid';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function BrandPageManager() {
    const { user, isUserLoading } = useUser();
    const [brand, setBrand] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    // Track if name can be edited (not yet set by user)
    const [canEditName, setCanEditName] = useState(false);
    const [nameChangeDialogOpen, setNameChangeDialogOpen] = useState(false);
    const [nameChangeRequest, setNameChangeRequest] = useState({ requestedName: '', reason: '' });
    const [submittingRequest, setSubmittingRequest] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        logoUrl: '',
        coverImageUrl: '',
        websiteUrl: ''
    });

    useEffect(() => {
        async function loadBrand() {
            if (!user?.uid) {
                setLoading(false);
                return;
            }

            try {
                const { getDoc, doc } = await import('firebase/firestore');
                const { db } = await import('@/firebase/client');

                if (!db) {
                    throw new Error('Firestore database not initialized.');
                }

                console.log('[BrandPage] Loading data for user:', user.uid);

                // 1. Get user doc to find brandId
                const userRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userRef);

                if (!userDoc.exists()) {
                    console.warn('[BrandPage] User document not found in Firestore');
                    setLoading(false);
                    return;
                }

                const userData = userDoc.data();
                const bId = userData?.brandId;

                console.log('[BrandPage] Brand ID from user doc:', bId);

                if (bId) {
                    // 2. Get brand doc
                    try {
                        const brandRef = doc(db, 'brands', bId);
                        const brandDoc = await getDoc(brandRef);

                        if (brandDoc.exists()) {
                            const bData = brandDoc.data();
                            console.log('[BrandPage] Brand data found:', bData.name);
                            setBrand({ id: bId, ...bData });

                            // Check if name can be edited (not yet set by user)
                            const isNameUnset = !bData.nameSetByUser &&
                                (!bData.name || bData.name === 'Unknown Brand' || bData.name.trim() === '');
                            setCanEditName(isNameUnset);

                            setFormData({
                                name: bData.name || '',
                                description: bData.description || '',
                                logoUrl: bData.logoUrl || '',
                                coverImageUrl: bData.coverImageUrl || '',
                                websiteUrl: bData.websiteUrl || ''
                            });
                        } else {
                            console.warn('[BrandPage] Brand document not found:', bId);
                            // Fallback to name from user doc if available
                            const fallbackName = userData?.brandName || 'Unknown Brand';
                            setBrand({ id: bId, name: fallbackName });
                            setCanEditName(true); // Allow editing since no brand doc exists
                            setFormData(prev => ({ ...prev, name: fallbackName }));
                        }
                    } catch (brandError) {
                        console.error('[BrandPage] Error reading brand doc:', brandError);
                        throw brandError;
                    }
                } else {
                    console.log('[BrandPage] No brandId associated with this user.');
                }
            } catch (error: any) {
                console.error('[BrandPage] Error loading brand:', error);

                // Detailed debug info
                if (error.code === 'permission-denied') {
                    console.error('PERMISSION DENIED DEBUG:', {
                        userId: user.uid,
                        attemptedPath: 'users/' + user.uid
                    });
                }

                toast({
                    variant: 'destructive',
                    title: 'Error Loading Brand',
                    description: error?.message || 'Failed to load brand data. Please try again.'
                });
            } finally {
                setLoading(false);
            }
        }

        if (!isUserLoading) {
            loadBrand();
        }
    }, [user, isUserLoading, toast]);

    const handleSave = async () => {
        if (!brand?.id) return;

        setSaving(true);
        try {
            const data = new FormData();
            data.append('description', formData.description);
            data.append('websiteUrl', formData.websiteUrl);
            data.append('logoUrl', formData.logoUrl);
            data.append('coverImageUrl', formData.coverImageUrl);

            // Include name if it's the initial set
            if (canEditName && formData.name.trim()) {
                data.append('name', formData.name.trim());
                data.append('isInitialNameSet', 'true');
            }

            const result = await updateBrandProfile(brand.id, data);

            if (result.success) {
                // If name was updated, lock the field
                const typedResult = result as { success: boolean; nameUpdated?: boolean };
                if (typedResult.nameUpdated) {
                    setCanEditName(false);
                    setBrand((prev: any) => ({ ...prev, name: formData.name.trim(), nameSetByUser: true }));
                }

                toast({
                    title: 'Settings Saved',
                    description: 'Your brand profile has been updated.'
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to save changes.'
                });
            }
        } catch (error) {
            console.error('Save error:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'An unexpected error occurred.'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading || isUserLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!brand?.id) {
        return (
            <div className="p-8 text-center bg-muted rounded-xl border-2 border-dashed">
                <h2 className="text-xl font-bold">No Brand Associated</h2>
                <p className="text-muted-foreground mt-2">
                    Your account is not linked to a brand page yet.
                </p>
                <Button className="mt-4" asChild>
                    <Link href="/onboarding?role=brand">Link Brand</Link>
                </Button>
            </div>
        );
    }

    const brandSlug = brand?.slug || brand?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || brand?.id;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Public Brand Page</h1>
                    <p className="text-muted-foreground">Manage your public presence on BakedBot.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/brands/${brandSlug}`} target="_blank">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Live Page
                        </Link>
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Core Information</CardTitle>
                        <CardDescription>Basic details shown on your global hub.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Brand Name</Label>
                            {canEditName ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Enter your brand name"
                                            className="border-primary"
                                        />
                                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                    </div>
                                    <p className="text-xs text-primary flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Set your brand name now. This cannot be changed without support approval.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Input value={brand?.name || 'Unknown Brand'} disabled className="bg-muted/50" />
                                    <p className="text-xs text-muted-foreground">
                                        <Button
                                            variant="link"
                                            className="h-auto p-0 text-xs"
                                            onClick={() => setNameChangeDialogOpen(true)}
                                        >
                                            Request a name change
                                        </Button>
                                    </p>
                                </>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Tell your brand story..."
                                className="min-h-[150px]"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Website URL</Label>
                            <Input
                                placeholder="https://yourbrand.com"
                                value={formData.websiteUrl}
                                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Assets</CardTitle>
                        <CardDescription>Logo and cover images.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Logo URL</Label>
                            <Input
                                placeholder="https://..."
                                value={formData.logoUrl}
                                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Cover Image URL</Label>
                            <Input
                                placeholder="https://..."
                                value={formData.coverImageUrl}
                                onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <SyncedProductsGrid brandId={brand.id} />

            {/* Name Change Request Dialog */}
            <Dialog open={nameChangeDialogOpen} onOpenChange={setNameChangeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Brand Name Change</DialogTitle>
                        <DialogDescription>
                            Submit a request to change your brand name. Our team will review it within 1-2 business days.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Current Name</Label>
                            <Input value={brand?.name || ''} disabled className="bg-muted/50" />
                        </div>
                        <div className="space-y-2">
                            <Label>Requested New Name</Label>
                            <Input
                                value={nameChangeRequest.requestedName}
                                onChange={(e) => setNameChangeRequest(prev => ({ ...prev, requestedName: e.target.value }))}
                                placeholder="Enter your new brand name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Reason for Change</Label>
                            <Textarea
                                value={nameChangeRequest.reason}
                                onChange={(e) => setNameChangeRequest(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Please explain why you want to change your brand name..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNameChangeDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={async () => {
                                if (!nameChangeRequest.requestedName.trim() || !nameChangeRequest.reason.trim()) {
                                    toast({
                                        variant: 'destructive',
                                        title: 'Missing Information',
                                        description: 'Please enter both a new name and reason for the change.'
                                    });
                                    return;
                                }

                                setSubmittingRequest(true);
                                try {
                                    const result = await requestBrandNameChange(
                                        brand.id,
                                        brand.name,
                                        nameChangeRequest.requestedName,
                                        nameChangeRequest.reason
                                    );

                                    if (result.success) {
                                        toast({
                                            title: 'Request Submitted',
                                            description: result.message
                                        });
                                        setNameChangeDialogOpen(false);
                                        setNameChangeRequest({ requestedName: '', reason: '' });
                                    }
                                } catch (error) {
                                    toast({
                                        variant: 'destructive',
                                        title: 'Error',
                                        description: 'Failed to submit request. Please try again.'
                                    });
                                } finally {
                                    setSubmittingRequest(false);
                                }
                            }}
                            disabled={submittingRequest}
                        >
                            {submittingRequest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Submit Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
