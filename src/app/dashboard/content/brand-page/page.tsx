import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { requireUser } from '@/server/auth/auth';
import { fetchBrandPageData } from '@/lib/brand-data';
import { logger } from '@/lib/logger';
import { createServerClient } from '@/firebase/server-client';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export default async function BrandPageManager() {
    const user = await requireUser();

    // Get extended profile to find brandId
    const { firestore } = await createServerClient();
    const userDoc = await firestore.collection('users').doc(user.uid).get();
    const userData = userDoc.data();
    const brandId = userData?.brandId;

    if (!brandId) {
        return (
            <div className="p-8 text-center">
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

    // Since we store brands in 'brands' collection (or via CannMenus ID), we fetch data
    // For now, let's assume fetchBrandPageData works by slug OR ID, or we fetch by ID directly.
    // fetchBrandPageData expects a SLUG. Use brandName or slug from profile?
    // Let's assume we store 'slug' in user profile or brand doc. 
    // Fallback: fetch brand doc directly.

    let brand: any = null;
    let slug = '';

    try {
        // Try to find brand doc
        const brandDoc = await firestore.collection('brands').doc(brandId).get();
        if (brandDoc.exists) {
            brand = brandDoc.data();
            slug = brand.slug || brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        } else {
            // Maybe it's a CannMenus ID?
            // For V1, let's just show the ID
        }
    } catch (err) {
        logger.error("Error fetching brand for manager", err);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Brand Page</h1>
                    <p className="text-muted-foreground">Manage your public presence on BakedBot.</p>
                </div>
                {slug && (
                    <Button variant="outline" asChild>
                        <Link href={`/brands/${slug}`} target="_blank">
                            View Live <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                )}
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
                            <Input defaultValue={brand?.name || userData?.brandName || 'Unknown Brand'} disabled />
                            <p className="text-xs text-muted-foreground">Contact support to change brand name.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Tell your brand story..."
                                className="min-h-[100px]"
                                defaultValue={brand?.description || ''}
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
                            <Input placeholder="https://..." defaultValue={brand?.logoUrl || ''} />
                        </div>
                        <div className="space-y-2">
                            <Label>Cover Image URL</Label>
                            <Input placeholder="https://..." defaultValue={brand?.coverImageUrl || ''} />
                        </div>
                        <Button>Save Changes</Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Featured Products</CardTitle>
                    <CardDescription>Select products to highlight on your page.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-8 text-center border-dashed border rounded-lg">
                        <p className="text-muted-foreground">Product selection coming soon.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
