
import { createServerClient } from '@/firebase/server-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { verifyClaimAction, rejectClaimAction } from '@/server/actions/admin-claims';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { BrandClaim } from '@/types/brand-page'; // Reusing existing type or new seo-engine one?
// seo-engine.ts has ClaimRequest, let's stick to brand-page or unify.
// implementation_plan calls for generic 'entity-claims.ts'.
// Let's import the server actions we will create next.

export default async function AdminClaimsPage() {
    const { firestore } = await createServerClient();

    // Fetch pending claims
    const snapshot = await firestore.collection('brandClaims') // Using existing collection for now
        .where('status', '==', 'pending')
        .orderBy('submittedAt', 'desc')
        .get();

    const claims = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return (
        <main className="min-h-screen bg-background pb-20 container mx-auto px-4 mt-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Claim Verification Queue</h1>
                <Badge variant="outline">{claims.length} Pending</Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    {claims.length === 0 ? (
                        <p className="text-muted-foreground">No pending claims.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Entity</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Proof</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {claims.map((claim: any) => (
                                    <TableRow key={claim.id}>
                                        <TableCell>
                                            <div className="font-medium">{claim.brandName}</div>
                                            <div className="text-xs text-muted-foreground">ID: {claim.brandId}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{claim.contactName}</div>
                                            <div className="text-xs text-muted-foreground">{claim.businessEmail}</div>
                                        </TableCell>
                                        <TableCell>
                                            {claim.website}
                                            {/* Future: Show file upload or verification token */}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {claim.submittedAt?.toDate?.().toLocaleDateString() || 'Just now'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <form action={async () => {
                                                    'use server';
                                                    await rejectClaimAction(claim.id);
                                                }}>
                                                    <Button size="sm" variant="destructive" type="submit">
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                </form>

                                                <form action={async () => {
                                                    'use server';
                                                    await verifyClaimAction(claim.id, claim.brandId);
                                                }}>
                                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" type="submit">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </Button>
                                                </form>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
