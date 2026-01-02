import { Metadata } from 'next';
import { getPassportAction } from '@/server/actions/passport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, Star, MapPin } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Marketplace | BakedBot',
    description: 'Find the specific products that match your preferences near you.',
};

export default async function ShopPage() {
    // 1. Fetch Global Passport
    const passport = await getPassportAction();

    return (
        <main className="min-h-screen bg-slate-50 pb-20">
            {/* Hero Section */}
            <section className="bg-white border-b border-slate-200 py-12 md:py-20">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-teal-600 mb-4">
                        Your Personal Cannabis Marketplace
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
                        We don't just show you menus. We find the specific products that match your biology and preferences.
                    </p>
                    
                    {!passport ? (
                        <Button size="lg" className="bg-green-600 hover:bg-green-700" asChild>
                            <Link href="/onboarding/passport">Create Your Taste Passport</Link>
                        </Button>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 py-2 px-4 rounded-full inline-flex">
                            <Star className="w-4 h-4 fill-current" />
                            <span>Passport Active: {passport.displayName || 'User'}</span>
                        </div>
                    )}
                </div>
            </section>

            {/* Recommendations Section */}
            <section className="container mx-auto px-4 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900">
                        {passport ? 'Recommended For You' : 'Trending Now'}
                    </h2>
                    <Button variant="ghost">View All</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Placeholder Cards */}
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="hover:shadow-lg transition-shadow cursor-pointer group">
                            <div className="aspect-square bg-slate-100 relative overflow-hidden text-center flex items-center justify-center">
                                {/* Image Placeholder */}
                                <ShoppingBag className="w-12 h-12 text-slate-300 opacity-50" />
                                
                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs font-medium flex items-center gap-1 shadow-sm">
                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                    <span>98% Match</span>
                                </div>
                            </div>
                            <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-base group-hover:text-green-700 transition-colors">
                                    Sleepy Time Gummies
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Wyld • Edible
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex items-center justify-between mt-2">
                                    <span className="font-bold text-slate-900">$24.00</span>
                                    <div className="flex items-center text-xs text-slate-500 gap-1">
                                        <MapPin className="w-3 h-3" />
                                        <span>Essex Apothecary</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </main>
    );
}
