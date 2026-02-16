import { getPassportAction } from '@/server/actions/passport'; // We need a way to get *public* passport data by ID. 
// Assuming getPassportAction() gets *current* user. We need a new action or modify it.
// For now, let's assume we can fetch by ID or we add that capability.
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, ShieldCheck, Star } from 'lucide-react';
import Link from 'next/link';

// Mock function for public passport fetch - in reality, we'd add `getPublicPassport(userId)` to passport.ts
async function getPublicPassport(userId: string) {
    // This would fetch from Firestore `users/{userId}/passport` or `passports/{userId}`
    // Return mock for prototype
    return {
        displayName: 'Verified Member',
        userId: userId,
        memberSince: '2025',
        tier: 'Gold',
    };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = await params;
    const profile = await getPublicPassport(userId);

    return (
        <main className="min-h-screen bg-green-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border-green-200">
                <CardHeader className="text-center bg-white rounded-t-xl pb-8 pt-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <ShieldCheck className="w-10 h-10" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-900">
                        {profile.displayName}
                    </CardTitle>
                    <CardDescription className="flex items-center justify-center gap-1 font-medium text-green-700">
                        <CheckCircle2 className="w-4 h-4" /> Verified Consumer
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <div className="text-xs text-slate-500 uppercase tracking-wide">Member Since</div>
                            <div className="font-bold text-slate-900">{profile.memberSince}</div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border">
                            <div className="text-xs text-slate-500 uppercase tracking-wide">Status</div>
                            <div className="font-bold text-green-700 flex items-center justify-center gap-1">
                                <Star className="w-3 h-3 fill-current" /> {profile.tier}
                            </div>
                        </div>
                    </div>

                    {/* The Growth Loop CTA */}
                    <div className="bg-slate-900 text-white p-6 rounded-xl text-center space-y-4">
                        <h3 className="font-bold text-lg">Are you a Dispensary?</h3>
                        <p className="text-slate-300 text-sm">
                            Claim your business on BakedBot to give {profile.displayName} loyalty points and personalized recommendations.
                        </p>
                        <Button className="w-full bg-green-500 hover:bg-green-600 font-bold text-slate-900" asChild>
                            <Link href="/get-started">Claim Business & Verify</Link>
                        </Button>
                    </div>

                     <div className="text-center">
                        <Link href="/" className="text-slate-400 text-sm hover:underline">
                            Powered by BakedBot AI
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
