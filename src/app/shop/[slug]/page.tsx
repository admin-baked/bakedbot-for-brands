import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTenantBySlugAction } from '@/server/actions/tenant';
import { getPassportAction } from '@/server/actions/passport';
import { getMembershipAction, joinOrganizationAction } from '@/server/actions/membership';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CheckCircle2, Star, ShoppingBag, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

// Force dynamic because we rely on request headers/cookies in sub-actions
export const dynamic = 'force-dynamic';

type PageProps = {
    params: { slug: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const tenant = await getTenantBySlugAction(params.slug);
    if (!tenant) return { title: 'Not Found' };
    return {
        title: `${tenant.crmData.name} | BakedBot Shop`,
        description: `Shop at ${tenant.crmData.name}`,
    };
}

export default async function TenantShopPage({ params }: PageProps) {
    // 1. Resolve Tenant
    const tenant = await getTenantBySlugAction(params.slug);
    if (!tenant) notFound();

    // 2. Resolve User Context
    const passport = await getPassportAction();
    let membership = null;

    if (passport && tenant.orgId) {
        membership = await getMembershipAction(tenant.orgId);
    }

    // Server Action Wrapped for "Join" button
    async function handleJoin() {
        'use server';
        if (tenant?.orgId) {
            await joinOrganizationAction(tenant.orgId);
            revalidatePath(`/shop/${params.slug}`);
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 pb-20">
            {/* Header / Cover */}
            <div className="bg-slate-900 text-white py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-slate-900 font-bold text-2xl shadow-lg">
                            {tenant.crmData.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
                                {tenant.crmData.name}
                                {tenant.orgId && <Badge variant="secondary" className="gap-1"><ShieldCheck className="w-3 h-3"/> Verified</Badge>}
                            </h1>
                            <p className="text-slate-400 mt-2 max-w-lg">
                                {tenant.type === 'dispensary' ? 'Licensed Dispensary' : 'Brand Page'} • {tenant.crmData.city || 'National'}, {tenant.crmData.state || 'USA'}
                            </p>
                        </div>
                        
                        <div className="md:ml-auto">
                           {membership ? (
                               <div className="flex flex-col items-center bg-green-900/50 p-4 rounded-xl border border-green-500/30">
                                   <div className="text-green-400 text-sm font-medium flex items-center gap-1">
                                       <Star className="w-4 h-4 fill-current"/> MEMBER
                                   </div>
                                   <div className="text-2xl font-bold">{membership.points || 0} pts</div>
                               </div>
                           ) : (
                               tenant.orgId && passport ? (
                                   <form action={handleJoin}>
                                       <Button size="lg" className="bg-green-600 hover:bg-green-700">
                                           Join Rewards Program
                                       </Button>
                                   </form>
                               ) : (
                                   !passport ? (
                                       <Button asChild variant="outline" className="text-white border-white/20 hover:bg-white/10">
                                           <Link href="/onboarding/passport">Create Passport to Join</Link>
                                       </Button>
                                   ) : (
                                       <Badge variant="outline" className="text-slate-400 border-slate-700">Unclaimed Page</Badge>
                                   )
                               )
                           )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Left Sidebar */}
                <aside className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">About</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-600 space-y-2">
                            <p>{tenant.crmData.description || "No description available."}</p>
                            {tenant.crmData.website && (
                                <Link href={tenant.crmData.website} target="_blank" className="text-blue-600 hover:underline block truncate">
                                    {tenant.crmData.website}
                                </Link>
                            )}
                        </CardContent>
                    </Card>

                   {membership && (
                       <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
                           <CardHeader>
                               <CardTitle className="text-base flex items-center gap-2">
                                   <CheckCircle2 className="w-4 h-4 text-green-400"/>
                                   My Preferences
                               </CardTitle>
                           </CardHeader>
                           <CardContent className="text-sm space-y-2 text-slate-300">
                               <p>You have shared your passport with {tenant.crmData.name}.</p>
                               <p className="text-xs opacity-70">They can see your strain preferences and order history.</p>
                           </CardContent>
                       </Card>
                   )}
                </aside>

                {/* Main Menu */}
                <div className="md:col-span-3">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Menu</h2>
                        <Button variant="outline">Filter</Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Placeholder Items */}
                         {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="hover:shadow-lg transition-shadow cursor-pointer group">
                            <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                 <ShoppingBag className="w-12 h-12 text-slate-300 opacity-50" />
                            </div>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-base group-hover:text-green-700 transition-colors">
                                    Premium Flower {i}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {tenant.crmData.name} • Sativa
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex items-center justify-between mt-2">
                                    <span className="font-bold text-slate-900">$45.00</span>
                                    <Button size="sm" variant="ghost" className="h-8">Add</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    </div>

                    {/* Upsell for Unclaimed */}
                    {!tenant.orgId && (
                       <div className="mt-12 bg-slate-900 text-white p-8 rounded-2xl text-center">
                           <h3 className="text-2xl font-bold mb-2">Is this your business?</h3>
                           <p className="text-slate-400 mb-6">Claim this page to manage your menu, view analytics, and connect with customers.</p>
                           <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100" asChild>
                               <Link href={`/claim?slug=${params.slug}`}>Claim This Page</Link>
                           </Button>
                       </div>
                    )}
                </div>
            </div>
        </main>
    );
}
